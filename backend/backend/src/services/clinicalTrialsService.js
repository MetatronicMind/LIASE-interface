const axios = require('axios');

// ClinicalTrials.gov API service
// API Documentation: https://clinicaltrials.gov/api/
class ClinicalTrialsService {
  constructor() {
    this.baseUrl = 'https://clinicaltrials.gov/api/query';
    this.studyFieldsUrl = 'https://clinicaltrials.gov/api/query/study_fields';
  }

  async searchStudies(drugName, options = {}) {
    try {
      const {
        maxResults = 50,
        status = 'completed',
        phase = null,
        studyType = 'Interventional'
      } = options;

      const params = {
        expr: `"${drugName}"`,
        fmt: 'json',
        min_rnk: 1,
        max_rnk: Math.min(maxResults, 1000)
      };

      // Add filters
      if (status && status !== 'all') {
        params.expr += ` AND ${status}[STUDY-STATUS]`;
      }

      if (phase) {
        params.expr += ` AND ${phase}[PHASE]`;
      }

      if (studyType) {
        params.expr += ` AND ${studyType}[STUDY-TYPE]`;
      }

      const response = await axios.get(`${this.studyFieldsUrl}`, {
        params: {
          ...params,
          fields: 'NCTId,BriefTitle,OfficialTitle,OverallStatus,Phase,StudyType,Condition,InterventionName,PrimaryOutcomeMeasure,SecondaryOutcomeMeasure,EnrollmentCount,StartDate,CompletionDate,LastUpdatePostDate,ResultsFirstPostDate,StudyFirstPostDate,Sponsor,CollaboratorName'
        }
      });

      if (!response.data || !response.data.StudyFieldsResponse) {
        return [];
      }

      const studies = response.data.StudyFieldsResponse.StudyFields || [];
      
      return studies.map(study => this.mapStudyFields(study, drugName));
    } catch (error) {
      console.error('Error searching clinical trials:', error.message);
      throw new Error(`Failed to search clinical trials: ${error.message}`);
    }
  }

  mapStudyFields(study, drugName) {
    const getField = (fieldName) => {
      const field = study.Field?.find(f => f.FieldName === fieldName);
      return field?.FieldValue || [];
    };

    const getSingleField = (fieldName) => {
      const values = getField(fieldName);
      return Array.isArray(values) ? values[0] : values || '';
    };

    return {
      nctId: getSingleField('NCTId'),
      briefTitle: getSingleField('BriefTitle'),
      officialTitle: getSingleField('OfficialTitle'),
      status: getSingleField('OverallStatus'),
      phase: getSingleField('Phase'),
      studyType: getSingleField('StudyType'),
      conditions: getField('Condition'),
      interventions: getField('InterventionName'),
      primaryOutcomes: getField('PrimaryOutcomeMeasure'),
      secondaryOutcomes: getField('SecondaryOutcomeMeasure'),
      enrollmentCount: getSingleField('EnrollmentCount'),
      startDate: getSingleField('StartDate'),
      completionDate: getSingleField('CompletionDate'),
      lastUpdate: getSingleField('LastUpdatePostDate'),
      resultsPosted: getSingleField('ResultsFirstPostDate'),
      firstPosted: getSingleField('StudyFirstPostDate'),
      sponsor: getSingleField('Sponsor'),
      collaborators: getField('CollaboratorName'),
      searchedDrug: drugName
    };
  }

  async getStudyDetails(nctId) {
    try {
      const response = await axios.get(`${this.studyFieldsUrl}`, {
        params: {
          expr: nctId,
          fmt: 'json',
          fields: 'NCTId,BriefTitle,OfficialTitle,DetailedDescription,OverallStatus,WhyStopped,Phase,StudyType,Condition,InterventionName,InterventionDescription,PrimaryOutcomeMeasure,SecondaryOutcomeMeasure,EnrollmentCount,EnrollmentType,StartDate,CompletionDate,StudyFirstPostDate,LastUpdatePostDate,ResultsFirstPostDate,Sponsor,CollaboratorName,LocationFacility,LocationCountry,EligibilityCriteria,HealthyVolunteers,Gender,MinimumAge,MaximumAge'
        }
      });

      if (!response.data?.StudyFieldsResponse?.StudyFields?.[0]) {
        throw new Error(`Study ${nctId} not found`);
      }

      const study = response.data.StudyFieldsResponse.StudyFields[0];
      return this.mapDetailedStudy(study);
    } catch (error) {
      console.error(`Error fetching study details for ${nctId}:`, error.message);
      throw error;
    }
  }

  mapDetailedStudy(study) {
    const getField = (fieldName) => {
      const field = study.Field?.find(f => f.FieldName === fieldName);
      return field?.FieldValue || [];
    };

    const getSingleField = (fieldName) => {
      const values = getField(fieldName);
      return Array.isArray(values) ? values[0] : values || '';
    };

    return {
      nctId: getSingleField('NCTId'),
      briefTitle: getSingleField('BriefTitle'),
      officialTitle: getSingleField('OfficialTitle'),
      description: getSingleField('DetailedDescription'),
      status: getSingleField('OverallStatus'),
      whyStopped: getSingleField('WhyStopped'),
      phase: getSingleField('Phase'),
      studyType: getSingleField('StudyType'),
      conditions: getField('Condition'),
      interventions: getField('InterventionName'),
      interventionDescriptions: getField('InterventionDescription'),
      primaryOutcomes: getField('PrimaryOutcomeMeasure'),
      secondaryOutcomes: getField('SecondaryOutcomeMeasure'),
      enrollment: {
        count: getSingleField('EnrollmentCount'),
        type: getSingleField('EnrollmentType')
      },
      dates: {
        start: getSingleField('StartDate'),
        completion: getSingleField('CompletionDate'),
        firstPosted: getSingleField('StudyFirstPostDate'),
        lastUpdate: getSingleField('LastUpdatePostDate'),
        resultsPosted: getSingleField('ResultsFirstPostDate')
      },
      sponsor: getSingleField('Sponsor'),
      collaborators: getField('CollaboratorName'),
      locations: {
        facilities: getField('LocationFacility'),
        countries: getField('LocationCountry')
      },
      eligibility: {
        criteria: getSingleField('EligibilityCriteria'),
        healthyVolunteers: getSingleField('HealthyVolunteers'),
        gender: getSingleField('Gender'),
        minAge: getSingleField('MinimumAge'),
        maxAge: getSingleField('MaximumAge')
      }
    };
  }

  async getDrugStudySummary(drugName, options = {}) {
    try {
      const studies = await this.searchStudies(drugName, options);
      
      // Get additional details for the most recent/relevant studies
      const detailedStudies = await Promise.all(
        studies.slice(0, 5).map(async (study) => {
          try {
            return await this.getStudyDetails(study.nctId);
          } catch (error) {
            console.warn(`Failed to get details for study ${study.nctId}:`, error.message);
            return study;
          }
        })
      );

      // Generate summary statistics
      const summary = this.generateStudySummary(studies, drugName);

      return {
        drugName,
        summary,
        studies: detailedStudies,
        totalStudies: studies.length,
        searchParams: options
      };
    } catch (error) {
      console.error(`Error getting study summary for ${drugName}:`, error);
      throw error;
    }
  }

  generateStudySummary(studies, drugName) {
    const phaseCount = {};
    const statusCount = {};
    const conditionCount = {};

    studies.forEach(study => {
      // Count phases
      if (study.phase) {
        phaseCount[study.phase] = (phaseCount[study.phase] || 0) + 1;
      }

      // Count statuses
      if (study.status) {
        statusCount[study.status] = (statusCount[study.status] || 0) + 1;
      }

      // Count conditions
      study.conditions?.forEach(condition => {
        if (condition) {
          conditionCount[condition] = (conditionCount[condition] || 0) + 1;
        }
      });
    });

    return {
      totalStudies: studies.length,
      phases: phaseCount,
      statuses: statusCount,
      topConditions: Object.entries(conditionCount)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10)
        .reduce((obj, [condition, count]) => ({ ...obj, [condition]: count }), {}),
      searchedDrug: drugName
    };
  }
}

module.exports = new ClinicalTrialsService();