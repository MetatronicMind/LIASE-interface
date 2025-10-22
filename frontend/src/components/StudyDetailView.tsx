"use client";
import React, { useState, useEffect } from 'react';

interface Study {
  id: string;
  pmid: string;
  title: string;
  authors: string;
  journal: string;
  publicationDate: string;
  abstract: string;
  drugName: string;
  adverseEvent: string;
  status: string;
  
  // AI Inference Data
  aiInferenceData?: any;
  doi?: string;
  specialCase?: string;
  countryOfFirstAuthor?: string;
  countryOfOccurrence?: string;
  patientDetails?: any;
  keyEvents?: string[];
  relevantDates?: any;
  administeredDrugs?: any[];
  attributability?: string;
  drugEffect?: string;
  summary?: string;
  identifiableHumanSubject?: boolean;
  textType?: string;
  authorPerspective?: string;
  confirmedPotentialICSR?: boolean;
  icsrClassification?: string;
  substanceGroup?: string;
  vancouverCitation?: string;
  leadAuthor?: string;
  serious?: boolean;
  testSubject?: string;
  aoiDrugEffect?: string;
  approvedIndication?: string;
  aoiClassification?: string;
  justification?: string;
  clientName?: string;
  sponsor?: string;
  userTag?: 'ICSR' | 'AOI' | 'No Case' | null;
  effectiveClassification?: string;
  
  createdAt: string;
  updatedAt: string;
  comments?: any[];
}

interface StudyDetailViewProps {
  study: Study;
  onUpdateTag?: (studyId: string, tag: 'ICSR' | 'AOI' | 'No Case') => void;
  onClose?: () => void;
  readonly?: boolean;
}

export default function StudyDetailView({ study, onUpdateTag, onClose, readonly = false }: StudyDetailViewProps) {
  const [selectedTag, setSelectedTag] = useState<'ICSR' | 'AOI' | 'No Case' | null>(study.userTag || null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'ai-analysis' | 'classification' | 'metadata'>('overview');

  const handleTagUpdate = async (tag: 'ICSR' | 'AOI' | 'No Case') => {
    if (readonly || !onUpdateTag) return;
    
    setLoading(true);
    try {
      await onUpdateTag(study.id, tag);
      setSelectedTag(tag);
    } catch (error) {
      console.error('Failed to update tag:', error);
    } finally {
      setLoading(false);
    }
  };

  const getClassificationColor = (classification?: string) => {
    switch (classification) {
      case 'ICSR': return 'bg-red-100 text-red-800 border-red-200';
      case 'AOI': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'No Case': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-600 border-gray-200';
    }
  };

  const formatValue = (value: any): string => {
    if (value === null || value === undefined) return 'Not specified';
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    if (Array.isArray(value)) return value.length > 0 ? value.join(', ') : 'None';
    if (typeof value === 'object') return JSON.stringify(value, null, 2);
    return String(value);
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: '📄' },
    { id: 'ai-analysis', label: 'AI Analysis', icon: '🤖' },
    { id: 'classification', label: 'Classification', icon: '🏷️' },
    { id: 'metadata', label: 'Metadata', icon: '📊' }
  ] as const;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl max-h-[90vh] w-full flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b bg-gray-50 rounded-t-lg">
          <div className="flex-1">
            <h2 className="text-xl font-semibold text-gray-900 mb-1">Study Details</h2>
            <p className="text-sm text-gray-600">PMID: {study.pmid}</p>
          </div>
          
          {/* Current Classification Badge */}
          <div className="flex items-center space-x-3">
            <div className={`px-3 py-1 rounded-full text-sm font-medium border ${getClassificationColor(study.effectiveClassification)}`}>
              {study.effectiveClassification || 'Unclassified'}
              {study.userTag && (
                <span className="ml-1 text-xs opacity-75">(Manual)</span>
              )}
            </div>
            
            {onClose && (
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b bg-gray-50">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center px-4 py-3 text-sm font-medium transition-colors border-b-2 ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600 bg-white'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-3">Publication Information</h3>
                <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Title</label>
                    <p className="text-gray-900">{study.title}</p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-700">Authors</label>
                      <p className="text-gray-900">{study.authors}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">Journal</label>
                      <p className="text-gray-900">{study.journal}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">Publication Date</label>
                      <p className="text-gray-900">{new Date(study.publicationDate).toLocaleDateString()}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">DOI</label>
                      <p className="text-gray-900">{formatValue(study.doi)}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-3">Drug & Adverse Event</h3>
                <div className="bg-gray-50 rounded-lg p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Drug Name</label>
                    <p className="text-gray-900">{study.drugName}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Adverse Event</label>
                    <p className="text-gray-900">{study.adverseEvent}</p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-3">Abstract</h3>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-gray-900 leading-relaxed">{study.abstract}</p>
                </div>
              </div>
            </div>
          )}

          {/* AI Analysis Tab */}
          {activeTab === 'ai-analysis' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-3">AI-Generated Summary</h3>
                <div className="bg-blue-50 rounded-lg p-4">
                  <p className="text-gray-900">{formatValue(study.summary)}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="text-md font-medium text-gray-900 mb-3">Patient Information</h4>
                  <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                    <div>
                      <label className="text-sm font-medium text-gray-700">Patient Details</label>
                      <p className="text-gray-900">{formatValue(study.patientDetails)}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">Test Subject</label>
                      <p className="text-gray-900">{formatValue(study.testSubject)}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">Identifiable Human Subject</label>
                      <p className="text-gray-900">{formatValue(study.identifiableHumanSubject)}</p>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-md font-medium text-gray-900 mb-3">Drug Information</h4>
                  <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                    <div>
                      <label className="text-sm font-medium text-gray-700">Administered Drugs</label>
                      <p className="text-gray-900">{formatValue(study.administeredDrugs)}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">Substance Group</label>
                      <p className="text-gray-900">{formatValue(study.substanceGroup)}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">Approved Indication</label>
                      <p className="text-gray-900">{formatValue(study.approvedIndication)}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-md font-medium text-gray-900 mb-3">Key Events & Timeline</h4>
                <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Key Events</label>
                    <p className="text-gray-900">{formatValue(study.keyEvents)}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Relevant Dates</label>
                    <p className="text-gray-900">{formatValue(study.relevantDates)}</p>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-md font-medium text-gray-900 mb-3">Analysis Results</h4>
                <div className="bg-gray-50 rounded-lg p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Attributability</label>
                    <p className="text-gray-900">{formatValue(study.attributability)}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Drug Effect</label>
                    <p className="text-gray-900">{formatValue(study.drugEffect)}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Serious</label>
                    <p className="text-gray-900">{formatValue(study.serious)}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Article of Interest Drug Effect</label>
                    <p className="text-gray-900">{formatValue(study.aoiDrugEffect)}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Classification Tab */}
          {activeTab === 'classification' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-3">AI Classifications</h3>
                <div className="bg-gray-50 rounded-lg p-4 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-700">ICSR Classification</label>
                      <p className="text-gray-900">{formatValue(study.icsrClassification)}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">Article of Interest Classification</label>
                      <p className="text-gray-900">{formatValue(study.aoiClassification)}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">Confirmed Potential ICSR</label>
                      <p className="text-gray-900">{formatValue(study.confirmedPotentialICSR)}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">Text Type</label>
                      <p className="text-gray-900">{formatValue(study.textType)}</p>
                    </div>
                  </div>
                  
                  {study.justification && (
                    <div>
                      <label className="text-sm font-medium text-gray-700">AI Justification</label>
                      <p className="text-gray-900 bg-white p-3 rounded border">{study.justification}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Manual Classification Override */}
              {!readonly && (
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-3">Manual Classification Override</h3>
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <p className="text-sm text-yellow-800 mb-4">
                      Override the AI classification with your own assessment. This will take precedence over AI recommendations.
                    </p>
                    
                    <div className="flex flex-wrap gap-3">
                      {(['ICSR', 'AOI', 'No Case'] as const).map((tag) => (
                        <button
                          key={tag}
                          onClick={() => handleTagUpdate(tag)}
                          disabled={loading}
                          className={`px-4 py-2 rounded-lg border transition-all ${
                            selectedTag === tag
                              ? getClassificationColor(tag).replace('bg-', 'bg-opacity-20 border-').replace('text-', 'text-').replace('border-', 'border-')
                              : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                          } ${loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                        >
                          {loading && selectedTag === tag ? (
                            <div className="flex items-center">
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                              Updating...
                            </div>
                          ) : (
                            tag
                          )}
                        </button>
                      ))}
                    </div>
                    
                    {study.userTag && (
                      <p className="text-sm text-gray-600 mt-3">
                        Current manual classification: <span className="font-medium">{study.userTag}</span>
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Metadata Tab */}
          {activeTab === 'metadata' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-3">Geographic Information</h3>
                <div className="bg-gray-50 rounded-lg p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Country of First Author</label>
                    <p className="text-gray-900">{formatValue(study.countryOfFirstAuthor)}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Country of Occurrence</label>
                    <p className="text-gray-900">{formatValue(study.countryOfOccurrence)}</p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-3">Author Information</h3>
                <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Lead Author</label>
                    <p className="text-gray-900">{formatValue(study.leadAuthor)}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Author Perspective</label>
                    <p className="text-gray-900">{formatValue(study.authorPerspective)}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Vancouver Citation</label>
                    <p className="text-gray-900 font-mono text-sm bg-white p-2 rounded border">{formatValue(study.vancouverCitation)}</p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-3">Administrative Information</h3>
                <div className="bg-gray-50 rounded-lg p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Client Name</label>
                    <p className="text-gray-900">{formatValue(study.clientName)}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Sponsor</label>
                    <p className="text-gray-900">{formatValue(study.sponsor)}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Special Case</label>
                    <p className="text-gray-900">{formatValue(study.specialCase)}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Status</label>
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      study.status === 'Approved' ? 'bg-green-100 text-green-800' :
                      study.status === 'Rejected' ? 'bg-red-100 text-red-800' :
                      study.status === 'Under Review' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {study.status}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-3">Timestamps</h3>
                <div className="bg-gray-50 rounded-lg p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Created At</label>
                    <p className="text-gray-900">{new Date(study.createdAt).toLocaleString()}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Last Updated</label>
                    <p className="text-gray-900">{new Date(study.updatedAt).toLocaleString()}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t bg-gray-50 rounded-b-lg">
          <div className="text-sm text-gray-500">
            Last updated: {new Date(study.updatedAt).toLocaleString()}
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              Close
            </button>
          )}
        </div>
      </div>
    </div>
  );
}