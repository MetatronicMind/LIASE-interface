const xml2js = require('xml2js'); // This stays for XML parsing

// Step 1: Search for articles related to drugs using the new custom endpoint
async function getDrugArticles(term, maxResults = 10) {
    // 1. Search for PMIDs using the new custom endpoint
    const searchUrl = `http://20.242.200.176/get_pmidlist/?search=${encodeURIComponent(term)}`;
    const searchResp = await fetch(searchUrl);
    const searchJson = await searchResp.json();
    
    // The new endpoint returns PMIDs directly in an array or object
    let pmidList = [];
    if (Array.isArray(searchJson)) {
        pmidList = searchJson;
    } else if (searchJson.pmids && Array.isArray(searchJson.pmids)) {
        pmidList = searchJson.pmids;
    } else if (searchJson.idlist && Array.isArray(searchJson.idlist)) {
        pmidList = searchJson.idlist;
    } else {
        console.log('No PMIDs found in response');
        return [];
    }
    
    if (pmidList.length === 0) {
        return [];
    }
    
    // Limit results to maxResults
    const limitedIds = pmidList.slice(0, maxResults);
    const ids = limitedIds.join(',');

    // 2. Fetch article details with efetch
    const fetchUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pubmed&id=${ids}&retmode=xml`;
    const fetchResp = await fetch(fetchUrl);
    
    if (!fetchResp.ok) {
      throw new Error(`PubMed fetch failed: ${fetchResp.status} ${fetchResp.statusText}`);
    }
    
    const xml = await fetchResp.text();

    // 3. Parse the XML response
    const parser = new xml2js.Parser();
    let articles;
    try {
      // Check if response is actually XML (should start with < not {)
      if (!xml.trim().startsWith('<')) {
        throw new Error(`PubMed response is not XML: ${xml.substring(0, 200)}`);
      }
      articles = await parser.parseStringPromise(xml);
    } catch (error) {
      throw new Error(`XML parsing failed: ${error.message}`);
    }

    // 4. Extract titles as an example
    return articles.PubmedArticleSet.PubmedArticle.map(article =>
        article.MedlineCitation[0].Article[0].ArticleTitle[0]
    );
}

// Usage Example
getDrugArticles('drug')
    .then(titles => console.log(titles))
    .catch(err => console.error(err));

// Simple PubMed client using NCBI E-utilities
// Docs: https://www.ncbi.nlm.nih.gov/books/NBK25500/
class PubMedService {
  constructor() {
    this.base = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils';
    this.tool = process.env.PUBMED_TOOL || 'liase-saas';
    this.email = process.env.PUBMED_EMAIL || undefined; // recommended by NCBI
    this.lastRequestTime = 0;
    this.minDelay = 334; // ~3 requests per second (NCBI recommendation without API key)
  }

  // Helper to respect rate limits
  async respectRateLimit() {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    
    if (timeSinceLastRequest < this.minDelay) {
      const delay = this.minDelay - timeSinceLastRequest;
      console.log(`Rate limiting: waiting ${delay}ms`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
    
    this.lastRequestTime = Date.now();
  }

  buildParams(extra = {}) {
    const params = { ...extra };
    if (this.tool) params.tool = this.tool;
    if (this.email) params.email = this.email;
    return params;
  }

  async search(query, { maxResults = 50, dateFrom, dateTo } = {}) {
    try {
      // Use the new custom PMID endpoint
      const params = new URLSearchParams({
        search: query
      });

      // The API requires both start_date and end_date, so provide defaults if missing
      const defaultStartDate = '2000-01-01'; // Default to year 2000 if no start date
      const defaultEndDate = new Date().toISOString().split('T')[0]; // Default to today if no end date

      // Add date range parameters (convert to YYYY-MM-DD format if needed)
      const startDate = dateFrom ? 
        (dateFrom.includes('/') ? dateFrom.replace(/\//g, '-') : dateFrom) : 
        defaultStartDate;
      const endDate = dateTo ? 
        (dateTo.includes('/') ? dateTo.replace(/\//g, '-') : dateTo) : 
        defaultEndDate;

      params.append('start_date', startDate);
      params.append('end_date', endDate);

      const searchUrl = `http://20.246.204.143/get_pmidlist/?${params.toString()}`;
      console.log('PubMed API call:', searchUrl);
      
      await this.respectRateLimit();
      const searchResp = await fetch(searchUrl);
      const data = await searchResp.json();
      console.log('PubMed API response:', data);
      
      // The new endpoint returns PMIDs directly in an array or object
      let ids = [];
      if (Array.isArray(data)) {
        ids = data;
      } else if (data.pmids && Array.isArray(data.pmids)) {
        ids = data.pmids;
      } else if (data.idlist && Array.isArray(data.idlist)) {
        ids = data.idlist;
      }
      
      // Limit results to maxResults
      if (ids.length > maxResults) {
        ids = ids.slice(0, maxResults);
      }
      
      console.log('Extracted PMIDs:', ids);
      
      return ids;
    } catch (error) {
      console.error('PubMed search error:', error.message);
      console.error('Error details:', error);
      throw new Error(`PubMed search failed: ${error.message}`);
    }
  }

  async fetchDetails(pmids = []) {
    if (!pmids.length) return [];

    const params = this.buildParams({
      db: 'pubmed',
      id: pmids.join(','),
      retmode: 'xml'
    });
    const fetchUrl = `${this.base}/efetch.fcgi?${new URLSearchParams(params)}`;
    const fetchResp = await fetch(fetchUrl);
    
    if (!fetchResp.ok) {
      console.error(`PubMed fetch failed: ${fetchResp.status} ${fetchResp.statusText}`);
      return [];
    }
    
    const xml = await fetchResp.text();
    
    let parsed;
    try {
      parsed = await this.safeParseXML(xml, 'fetchDetails');
    } catch (error) {
      console.error('Failed to parse XML in fetchDetails:', error.message);
      return [];
    }

    const articles = parsed?.PubmedArticleSet?.PubmedArticle || [];
    const list = Array.isArray(articles) ? articles : [articles];

    return list.filter(Boolean).map(a => this.mapArticle(a));
  }

  mapArticle(a) {
    try {
      const art = a?.MedlineCitation?.[0]?.Article?.[0] || {};
      const journal = art?.Journal?.[0]?.Title?.[0] || '';
      const pubDateNode = art?.Journal?.[0]?.JournalIssue?.[0]?.PubDate?.[0] || {};
      const year = pubDateNode?.Year?.[0] || pubDateNode?.MedlineDate?.[0] || '';
      const publicationDate = typeof year === 'string' ? `${year}-01-01` : new Date().toISOString();
      const title = art?.ArticleTitle?.[0] || '';

      const abstractNode = art?.Abstract?.[0];
      let abstract = '';
      if (abstractNode?.AbstractText) {
        if (Array.isArray(abstractNode.AbstractText)) {
          abstract = abstractNode.AbstractText.map(t => (typeof t === 'string' ? t : t._ || '')).join('\n');
        } else {
          abstract = abstractNode.AbstractText || '';
        }
      }

      const pmid = a?.MedlineCitation?.[0]?.PMID?.[0] || '';

      let authors = [];
      const authorList = art?.AuthorList?.[0]?.Author;
      if (authorList) {
        authors = authorList.map(x => {
          const last = x?.LastName?.[0] || '';
          const fore = x?.ForeName?.[0] || x?.Initials?.[0] || '';
          return `${fore} ${last}`.trim();
        }).filter(Boolean);
      }

      return {
        pmid,
        title,
        journal,
        publicationDate,
        abstract,
        authors
      };
    } catch (e) {
      console.error('Error mapping article:', e);
      return null;
    }
  }

  // Enhanced drug articles search using the new custom PMID endpoint
  async getDrugArticles(term, maxResults = 10) {
    try {
      // 1. Search for PMIDs using the new custom endpoint
      // Provide default dates since the API requires them
      const defaultStartDate = '2000-01-01'; 
      const defaultEndDate = new Date().toISOString().split('T')[0]; 
      
      const searchUrl = `http://20.242.192.125/get_pmidlist/?search=${encodeURIComponent(term)}&start_date=${defaultStartDate}&end_date=${defaultEndDate}`;
      console.log('Search URL:', searchUrl);
      
      const searchResp = await fetch(searchUrl);
      const searchJson = await searchResp.json();
      console.log('Search response:', JSON.stringify(searchJson, null, 2));
      
      // The new endpoint returns PMIDs directly in an array or object
      let pmidList = [];
      if (Array.isArray(searchJson)) {
        pmidList = searchJson;
      } else if (searchJson.pmids && Array.isArray(searchJson.pmids)) {
        pmidList = searchJson.pmids;
      } else if (searchJson.idlist && Array.isArray(searchJson.idlist)) {
        pmidList = searchJson.idlist;
      } else {
        console.log('No PMIDs found in response for term:', term);
        return [];
      }
      
      if (pmidList.length === 0) {
        console.log('No articles found for term:', term);
        return [];
      }
      
      // Limit results to maxResults
      const limitedIds = pmidList.slice(0, maxResults);
      const ids = limitedIds.join(',');
      console.log('Found PMIDs:', ids);

      // 2. Fetch article details with efetch
      const fetchUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pubmed&id=${ids}&retmode=xml`;
      console.log('Fetch URL:', fetchUrl);
      
      const fetchResp = await fetch(fetchUrl);
      
      // Check if response is OK
      if (!fetchResp.ok) {
        console.error('Fetch response not OK:', fetchResp.status, fetchResp.statusText);
        throw new Error(`HTTP error! status: ${fetchResp.status}`);
      }
      
      const xml = await fetchResp.text();
      console.log('XML response length:', xml.length);
      console.log('XML response first 200 chars:', xml.substring(0, 200));

      // Check if response is actually XML
      if (!xml.trim().startsWith('<?xml') && !xml.trim().startsWith('<')) {
        console.error('Response is not XML:', xml.substring(0, 500));
        
        // Try to parse as JSON (sometimes PubMed returns JSON errors)
        try {
          const jsonResponse = JSON.parse(xml);
          console.log('PubMed returned JSON instead of XML:', jsonResponse);
          if (jsonResponse.error) {
            throw new Error(`PubMed API error: ${jsonResponse.error}`);
          }
        } catch (jsonError) {
          console.error('Response is neither valid XML nor JSON');
        }
        
        throw new Error('Invalid XML response from PubMed');
      }

      // 3. Parse the XML response with better error handling
      const parser = new xml2js.Parser();
      let articles;
      
      try {
        articles = await parser.parseStringPromise(xml);
      } catch (parseError) {
        console.error('XML parsing error:', parseError.message);
        console.error('Problematic XML (first 1000 chars):', xml.substring(0, 1000));
        
        // Try to continue with an empty result instead of crashing
        console.log('Returning empty results due to XML parsing error');
        return [];
      }

      // 4. Extract PMID, Drug Name, Sponsor if present
      if (!articles.PubmedArticleSet || !articles.PubmedArticleSet.PubmedArticle) {
        return [];
      }

      return articles.PubmedArticleSet.PubmedArticle.map(article => {
        // PMID - handle both string and object formats
        let pmid = article.MedlineCitation[0].PMID[0];
        if (typeof pmid === 'object' && pmid._) {
          pmid = pmid._;
        }

        // Drug Name: try MeSH Headings first, else ArticleTitle
        let drugName = '';
        try {
          if (article.MedlineCitation[0].MeshHeadingList && article.MedlineCitation[0].MeshHeadingList[0].MeshHeading) {
              const descriptor = article.MedlineCitation[0].MeshHeadingList[0].MeshHeading
                  .map(mh => {
                    if (mh.DescriptorName && mh.DescriptorName[0]) {
                      return typeof mh.DescriptorName[0] === 'string' ? mh.DescriptorName[0] : mh.DescriptorName[0]._;
                    }
                    return null;
                  })
                  .filter(Boolean);
              drugName = descriptor.join(', ');
          }
          
          // If no MeSH headings found, use article title
          if (!drugName && article.MedlineCitation[0].Article[0].ArticleTitle) {
              drugName = article.MedlineCitation[0].Article[0].ArticleTitle[0];
          }
        } catch (error) {
          console.log('Error extracting drug name:', error.message);
          drugName = article.MedlineCitation[0].Article[0].ArticleTitle[0] || '';
        }

        // Sponsor (from GrantList, if available)
        let sponsor = '';
        try {
          if (
              article.MedlineCitation[0].GrantList &&
              article.MedlineCitation[0].GrantList[0].Grant &&
              article.MedlineCitation[0].GrantList[0].Grant[0].Agency
          ) {
              sponsor = article.MedlineCitation[0].GrantList[0].Grant[0].Agency[0];
              if (typeof sponsor === 'object' && sponsor._) {
                sponsor = sponsor._;
              }
          }
        } catch (error) {
          console.log('Error extracting sponsor:', error.message);
          sponsor = '';
        }

        // Extract title and journal safely
        let title = '';
        let journal = '';
        let publicationDate = '';
        
        try {
          title = article.MedlineCitation[0].Article[0].ArticleTitle[0] || '';
          journal = article.MedlineCitation[0].Article[0].Journal[0].Title[0] || '';
          publicationDate = this.extractPublicationDate(article.MedlineCitation[0].Article[0]);
        } catch (error) {
          console.log('Error extracting article details:', error.message);
        }

        return { 
          PMID: pmid, 
          DrugName: drugName, 
          Sponsor: sponsor,
          Title: title,
          Journal: journal,
          PublicationDate: publicationDate
        };
      });
    } catch (error) {
      console.error('Error in getDrugArticles:', error);
      throw error;
    }
  }

  // Helper method to extract publication date
  extractPublicationDate(articleData) {
    try {
      if (articleData.Journal && articleData.Journal[0] && articleData.Journal[0].JournalIssue && 
          articleData.Journal[0].JournalIssue[0] && articleData.Journal[0].JournalIssue[0].PubDate) {
        const pubDate = articleData.Journal[0].JournalIssue[0].PubDate[0];
        const year = pubDate.Year ? pubDate.Year[0] : '';
        const month = pubDate.Month ? pubDate.Month[0] : '01';
        const day = pubDate.Day ? pubDate.Day[0] : '01';
        return year ? `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}` : '';
      }
      return '';
    } catch (error) {
      return '';
    }
  }

  // Search for drug-related articles and extract drug names with PMIDs
  async searchDrugArticles(options = {}) {
    const { 
      includeAdverseEvents = true, 
      includeSafety = true, 
      includeToxicity = false,
      maxResults = 100,
      dateFrom,
      dateTo 
    } = options;

    console.log('searchDrugArticles called with options:', options);

    // Build broad drug search query
    const drugTerms = [
      'drug[tiab]', 'medication[tiab]', 'pharmaceutical[tiab]', 
      'medicine[tiab]', 'therapeutic[tiab]', 'treatment[tiab]'
    ];
    
    // Add safety-related terms
    const safetyTerms = [];
    if (includeAdverseEvents) {
      safetyTerms.push('"adverse event"[tiab]', '"adverse events"[tiab]', '"side effect"[tiab]', '"side effects"[tiab]');
    }
    if (includeSafety) {
      safetyTerms.push('"safety"[tiab]', '"drug safety"[tiab]');
    }
    if (includeToxicity) {
      safetyTerms.push('"toxicity"[tiab]', '"toxic"[tiab]');
    }

    const drugQuery = `(${drugTerms.join(' OR ')})`;
    const safetyQuery = safetyTerms.length ? ` AND (${safetyTerms.join(' OR ')})` : '';
    const finalQuery = drugQuery + safetyQuery;

    console.log('PubMed search query:', finalQuery);
    console.log('Search parameters:', { maxResults, dateFrom, dateTo });

    try {
      // Use the new enhanced getDrugArticles method
      const articles = await this.getDrugArticles(finalQuery, maxResults);
      console.log('Articles fetched:', articles.length);
      
      if (articles.length === 0) {
        console.log('No articles found, returning empty array');
        return [];
      }
      
      // Extract drug names from articles
      console.log('Extracting drugs from articles...');
      const extractedDrugs = this.extractDrugsFromArticles(articles);
      console.log('Drugs extracted:', extractedDrugs.length);
      
      return extractedDrugs;
    } catch (error) {
      console.error('Error in searchDrugArticles:', error);
      throw error;
    }
  }

  // Search for specific drug by name
  async searchDrugs(drugName, options = {}) {
    const { 
      includeAdverseEvents = true, 
      includeSafety = true, 
      includeToxicity = false,
      maxResults = 50,
      dateFrom,
      dateTo 
    } = options;

    // Build drug-specific query
    let queryParts = [`"${drugName}"[tiab]`, `"${drugName}"[tw]`];
    
    // Add safety-related terms
    const safetyTerms = [];
    if (includeAdverseEvents) {
      safetyTerms.push('"adverse event"[tiab]', '"adverse events"[tiab]', '"side effect"[tiab]', '"side effects"[tiab]');
    }
    if (includeSafety) {
      safetyTerms.push('"safety"[tiab]', '"drug safety"[tiab]');
    }
    if (includeToxicity) {
      safetyTerms.push('"toxicity"[tiab]', '"toxic"[tiab]');
    }

    const drugQuery = `(${queryParts.join(' OR ')})`;
    const safetyQuery = safetyTerms.length ? ` AND (${safetyTerms.join(' OR ')})` : '';
    const finalQuery = drugQuery + safetyQuery;

    return this.search(finalQuery, { maxResults, dateFrom, dateTo });
  }

  async searchDrugInfo(drugName, options = {}) {
    const { maxResults = 20 } = options;
    
    // Search for general drug information
    const query = `("${drugName}"[tiab] OR "${drugName}"[tw]) AND (pharmacology[tiab] OR mechanism[tiab] OR indication[tiab] OR therapeutic[tiab])`;
    
    return this.search(query, { maxResults });
  }

  async getDrugSummary(drugName, options = {}) {
    try {
      // Get both safety data and general info
      const [safetyIds, infoIds] = await Promise.all([
        this.searchDrugs(drugName, { maxResults: 20, ...options }),
        this.searchDrugInfo(drugName, { maxResults: 10 })
      ]);

      // Combine and deduplicate IDs
      const allIds = [...new Set([...safetyIds, ...infoIds])];
      
      if (allIds.length === 0) {
        return {
          drugName,
          articles: [],
          summary: {
            totalArticles: 0,
            safetyArticles: safetyIds.length,
            infoArticles: infoIds.length
          }
        };
      }

      // Fetch detailed articles
      const articles = await this.fetchDetails(allIds.slice(0, 30)); // Limit to 30 for performance

      return {
        drugName,
        articles,
        summary: {
          totalArticles: articles.length,
          safetyArticles: safetyIds.length,
          infoArticles: infoIds.length,
          query: `Safety articles for ${drugName}`
        }
      };
    } catch (error) {
      console.error(`Error getting drug summary for ${drugName}:`, error);
      throw error;
    }
  }

  // Extract drug names from articles using pattern matching
  extractDrugsFromArticles(articles) {
    const drugPattern = /\b([A-Z][a-z]+(?:in|ol|ide|ine|ate|ant|ase|ast|ent|ic|al|um|an|or))\b/g;
    const commonDrugs = new Set([
      'Aspirin', 'Ibuprofen', 'Acetaminophen', 'Metformin', 'Lisinopril', 'Simvastatin',
      'Omeprazole', 'Amlodipine', 'Metoprolol', 'Hydrochlorothiazide', 'Atorvastatin',
      'Levothyroxine', 'Albuterol', 'Furosemide', 'Prednisone', 'Tramadol', 'Gabapentin',
      'Amoxicillin', 'Ciprofloxacin', 'Warfarin', 'Insulin', 'Morphine', 'Codeine',
      'Digoxin', 'Propranolol', 'Losartan', 'Citalopram', 'Sertraline', 'Fluoxetine',
      'Lorazepam', 'Alprazolam', 'Diazepam', 'Oxycodone', 'Fentanyl', 'Clonazepam'
    ]);

    const extractedDrugs = [];
    const seenDrugs = new Set();

    articles.forEach(article => {
      const title = article.title || '';
      const abstract = article.abstract || '';
      const textToSearch = `${title} ${abstract}`.toLowerCase();
      
      // Look for known drug names (case-insensitive)
      commonDrugs.forEach(drug => {
        const drugLower = drug.toLowerCase();
        if (textToSearch.includes(drugLower) && !seenDrugs.has(drugLower)) {
          seenDrugs.add(drugLower);
          extractedDrugs.push({
            drugName: drug,
            pmid: article.pmid,
            title: title,
            journal: article.journal,
            publicationDate: article.publicationDate,
            abstract: abstract,
            authors: article.authors || [],
            relevantText: this.extractRelevantText(textToSearch, drugLower),
            confidence: this.calculateDrugConfidence(textToSearch, drugLower)
          });
        }
      });

      // Also try pattern matching for potential drug names
      const matches = title.match(drugPattern) || [];
      const abstractMatches = abstract.match(drugPattern) || [];
      const allMatches = [...matches, ...abstractMatches];

      allMatches.forEach(match => {
        const drugLower = match.toLowerCase();
        if (!seenDrugs.has(drugLower) && match.length > 4) { // Filter out short matches
          seenDrugs.add(drugLower);
          extractedDrugs.push({
            drugName: match,
            pmid: article.pmid,
            title: title,
            journal: article.journal,
            publicationDate: article.publicationDate,
            abstract: abstract,
            authors: article.authors || [],
            relevantText: this.extractRelevantText(`${title} ${abstract}`, drugLower),
            confidence: this.calculateDrugConfidence(textToSearch, drugLower),
            isPatternMatch: true
          });
        }
      });
    });

    // Sort by confidence and return top results
    return extractedDrugs
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 50); // Limit results
  }

  extractRelevantText(text, drugName) {
    const index = text.toLowerCase().indexOf(drugName);
    if (index === -1) return '';
    
    const start = Math.max(0, index - 100);
    const end = Math.min(text.length, index + drugName.length + 100);
    
    return text.substring(start, end).trim();
  }

  calculateDrugConfidence(text, drugName) {
    let confidence = 0;
    
    // Base confidence for finding the drug name
    confidence += 10;
    
    // Boost confidence for safety-related keywords
    const safetyKeywords = ['adverse', 'side effect', 'toxicity', 'safety', 'reaction', 'allergy'];
    safetyKeywords.forEach(keyword => {
      if (text.includes(keyword)) confidence += 5;
    });
    
    // Boost confidence for clinical keywords
    const clinicalKeywords = ['clinical', 'trial', 'study', 'patient', 'treatment', 'therapy'];
    clinicalKeywords.forEach(keyword => {
      if (text.includes(keyword)) confidence += 3;
    });
    
    // Penalize very common words that might be false positives
    const commonWords = ['the', 'and', 'for', 'with', 'from', 'this', 'that'];
    if (commonWords.includes(drugName.toLowerCase())) confidence -= 20;
    
    return Math.max(0, confidence);
  }

  // Get drug discovery results with PMIDs using the working approach
  async discoverDrugs(options = {}) {
    const { maxResults = 1000, dateFrom, dateTo, query = 'drug', sponsor = '', frequency = 'custom' } = options;
    
    try {
      console.log('Starting drug discovery with options:', options);
      console.log('📅 Date parameters received - dateFrom:', dateFrom, 'dateTo:', dateTo);
      
      // Calculate automatic date ranges based on frequency
      let effectiveDateFrom = dateFrom;
      let effectiveDateTo = dateTo;
      
      if (frequency !== 'custom') {
        const dateRange = this.calculateFrequencyDateRange(frequency);
        effectiveDateFrom = dateRange.dateFrom;
        effectiveDateTo = dateRange.dateTo;
        console.log(`Auto-calculated date range for ${frequency}: ${effectiveDateFrom} to ${effectiveDateTo}`);
      } else {
        console.log(`Using custom date range: ${effectiveDateFrom} to ${effectiveDateTo}`);
      }
      
      // Build search term without sponsor (sponsor will be passed to AI inference later)
      let searchTerm = query;
      
      // Use the new custom PMID endpoint with date range support
      const params = new URLSearchParams({
        search: searchTerm
      });
      
      // Add date range parameters - the API requires both start_date and end_date
      const defaultStartDate = '2000-01-01'; 
      const defaultEndDate = new Date().toISOString().split('T')[0]; 
      
      const startDate = effectiveDateFrom ? effectiveDateFrom.replace(/\//g, '-') : defaultStartDate;
      const endDate = effectiveDateTo ? effectiveDateTo.replace(/\//g, '-') : defaultEndDate;
      
      params.append('start_date', startDate);
      params.append('end_date', endDate);
      console.log('Using date range:', startDate, 'to', endDate);
      
      const searchUrl = `http://52.191.200.41/get_pmidlist/?${params.toString()}`;
      console.log('🔗 Final Search URL:', searchUrl);
      console.log('🔗 URL Parameters:', params.toString());
      
      const searchResp = await fetch(searchUrl);
      console.log('📡 Search response status:', searchResp.status);
      console.log('📡 Search response headers:', Object.fromEntries(searchResp.headers.entries()));
      
      if (!searchResp.ok) {
        console.error(`❌ Custom PMID endpoint failed: ${searchResp.status} ${searchResp.statusText}`);
        const errorText = await searchResp.text();
        console.error('❌ Error response:', errorText);
        return {
          totalFound: 0,
          drugs: [],
          searchDate: new Date().toISOString(),
          searchParams: options,
          error: `Custom endpoint failed: ${searchResp.status} - ${errorText}`
        };
      }
      
      const searchJson = await searchResp.json();
      console.log('📋 Raw Search response:', JSON.stringify(searchJson, null, 2));
      
      // The custom endpoint returns PMIDs directly as an array
      let pmidList = [];
      if (Array.isArray(searchJson)) {
        pmidList = searchJson;
        console.log(`✅ Custom endpoint returned ${pmidList.length} PMIDs as direct array`);
      } else if (searchJson.pmids && Array.isArray(searchJson.pmids)) {
        pmidList = searchJson.pmids;
        console.log(`✅ Custom endpoint returned ${pmidList.length} PMIDs in pmids property`);
      } else if (searchJson.idlist && Array.isArray(searchJson.idlist)) {
        pmidList = searchJson.idlist;
        console.log(`✅ Custom endpoint returned ${pmidList.length} PMIDs in idlist property`);
      } else {
        console.error('❌ No PMIDs found in custom endpoint response');
        console.error('❌ Response structure:', JSON.stringify(searchJson, null, 2));
        return {
          totalFound: 0,
          drugs: [],
          searchDate: new Date().toISOString(),
          searchParams: options,
          message: 'No results found from custom endpoint'
        };
      }
      
      if (pmidList.length === 0) {
        console.log('❌ No articles found in response');
        return {
          totalFound: 0,
          drugs: [],
          searchDate: new Date().toISOString(),
          searchParams: options
        };
      }
      
      // Limit results to maxResults to avoid overwhelming the system
      if (pmidList.length > maxResults) {
        console.log(`📊 Limiting results from ${pmidList.length} to ${maxResults} PMIDs`);
        pmidList = pmidList.slice(0, maxResults);
      }
      
      const ids = pmidList.join(',');
      console.log(`🔗 Processing ${pmidList.length} PMIDs for PubMed fetch`);
      console.log(`🔗 First 3 PMIDs:`, pmidList.slice(0, 3));
      console.log(`🔗 Total character length of ID string:`, ids.length);
      
      // PubMed has URL length limits - if too many PMIDs, reduce the batch
      if (ids.length > 8000) { // Conservative limit to avoid URL too long errors
        const reducedCount = Math.floor(8000 / (ids.length / pmidList.length));
        console.log(`⚠️ URL too long (${ids.length} chars), reducing from ${pmidList.length} to ${reducedCount} PMIDs`);
        pmidList = pmidList.slice(0, reducedCount);
      }
      
      const finalIds = pmidList.join(','); // Recalculate after potential reduction

      // 2. Fetch article details with efetch
      const fetchUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pubmed&id=${finalIds}&retmode=xml`;
      console.log('📡 About to fetch article details from PubMed');
      console.log('📡 Fetch URL length:', fetchUrl.length);
      console.log('📡 Making request to PubMed efetch...');
      
      const startTime = Date.now();
      
      const fetchResp = await fetch(fetchUrl);
      const fetchTime = Date.now() - startTime;
      console.log(`📡 PubMed fetch completed in ${fetchTime}ms`);
      console.log('📡 Response status:', fetchResp.status);
      console.log('📡 Response headers:', Object.fromEntries(fetchResp.headers.entries()));
      
      if (!fetchResp.ok) {
        console.error(`❌ PubMed fetch failed: ${fetchResp.status} ${fetchResp.statusText}`);
        const errorText = await fetchResp.text();
        console.error('❌ PubMed fetch error response:', errorText);
        return {
          totalFound: 0,
          drugs: [],
          searchDate: new Date().toISOString(),
          searchParams: options,
          error: `PubMed fetch failed: ${fetchResp.status}`
        };
      }
      
      console.log('📄 Reading XML response...');
      const xml = await fetchResp.text();
      console.log('📄 Got XML response, length:', xml.length, 'chars');
      
      if (xml.length < 100) {
        console.error('❌ XML response too short, might be empty:', xml);
        return {
          totalFound: 0,
          drugs: [],
          searchDate: new Date().toISOString(),
          searchParams: options,
          error: 'Empty XML response from PubMed'
        };
      }

      // 3. Parse the XML response
      let articles;
      try {
        articles = await this.safeParseXML(xml, 'discoverDrugs');
        console.log('🔍 Parsed XML articles:', articles.length);
        
        if (articles.length === 0) {
          console.warn('⚠️ No articles parsed from XML, checking XML structure...');
          console.log('XML preview (first 500 chars):', xml.substring(0, 500));
        }
      } catch (error) {
        console.error('❌ Failed to parse XML in discoverDrugs:', error.message);
        console.error('❌ Error details:', error);
        console.log('❌ XML preview (first 500 chars):', xml.substring(0, 500));
        return {
          totalFound: 0,
          drugs: [],
          searchDate: new Date().toISOString(),
          searchParams: options,
          error: `XML parsing failed: ${error.message}`
        };
      }

      if (!articles.PubmedArticleSet || !articles.PubmedArticleSet.PubmedArticle) {
        console.error('❌ No articles in XML response structure');
        console.log('❌ Articles structure:', JSON.stringify(articles, null, 2).substring(0, 1000));
        return {
          totalFound: 0,
          drugs: [],
          searchDate: new Date().toISOString(),
          searchParams: options,
          error: 'No articles found in XML structure'
        };
      }

      console.log(`📚 Found ${articles.PubmedArticleSet.PubmedArticle.length} articles in XML`);

      // 4. Extract PMID, Drug Name, Sponsor using the working logic
      const drugArticles = articles.PubmedArticleSet.PubmedArticle.map(article => {
        // PMID - handle both string and object formats
        let pmid = article.MedlineCitation[0].PMID[0];
        if (typeof pmid === 'object' && pmid._) {
          pmid = pmid._;
        }
        pmid = pmid.toString();

        // Drug Name: try MeSH Headings first, else ArticleTitle
        let drugName = '';
        try {
          if (article.MedlineCitation[0].MeshHeadingList && article.MedlineCitation[0].MeshHeadingList[0].MeshHeading) {
              const descriptor = article.MedlineCitation[0].MeshHeadingList[0].MeshHeading
                  .map(mh => {
                    if (mh.DescriptorName && mh.DescriptorName[0]) {
                      const desc = mh.DescriptorName[0];
                      return typeof desc === 'string' ? desc : (desc._ || desc);
                    }
                    return null;
                  })
                  .filter(Boolean);
              drugName = descriptor.join(', ');
          }
          
          if (!drugName && article.MedlineCitation[0].Article[0].ArticleTitle) {
              const articleTitle = article.MedlineCitation[0].Article[0].ArticleTitle[0];
              drugName = typeof articleTitle === 'string' ? articleTitle : (articleTitle._ || articleTitle);
          }
        } catch (e) {
          drugName = '';
        }

        // Sponsor (from GrantList, if available)
        let sponsor = '';
        try {
          if (
              article.MedlineCitation[0].GrantList &&
              article.MedlineCitation[0].GrantList[0].Grant &&
              article.MedlineCitation[0].GrantList[0].Grant[0].Agency
          ) {
              const agency = article.MedlineCitation[0].GrantList[0].Grant[0].Agency[0];
              sponsor = typeof agency === 'string' ? agency : (agency._ || agency);
          }
        } catch (e) {
          sponsor = '';
        }

        // Get title and journal - handle both string and object formats
        let title = '';
        let journal = '';
        
        try {
          const articleTitle = article.MedlineCitation[0].Article[0].ArticleTitle[0];
          title = typeof articleTitle === 'string' ? articleTitle : (articleTitle._ || articleTitle);
          
          const journalTitle = article.MedlineCitation[0].Article[0].Journal[0].Title[0];
          journal = typeof journalTitle === 'string' ? journalTitle : (journalTitle._ || journalTitle);
        } catch (e) {
          title = '';
          journal = '';
        }
        
        // Get publication date
        let publicationDate = '';
        try {
          if (article.MedlineCitation[0].Article[0].Journal[0].JournalIssue[0].PubDate) {
            const pubDate = article.MedlineCitation[0].Article[0].Journal[0].JournalIssue[0].PubDate[0];
            let year = pubDate.Year ? pubDate.Year[0] : '';
            // Handle object format
            if (typeof year === 'object' && year._) {
              year = year._;
            }
            publicationDate = year.toString();
          }
        } catch (e) {
          publicationDate = '';
        }

        // Get abstract
        let abstract = '';
        try {
          const abstractNode = article.MedlineCitation[0].Article[0].Abstract;
          if (abstractNode && abstractNode[0] && abstractNode[0].AbstractText) {
            const abstractText = abstractNode[0].AbstractText;
            if (Array.isArray(abstractText)) {
              abstract = abstractText.map(t => (typeof t === 'string' ? t : t._ || '')).join('\n');
            } else {
              abstract = typeof abstractText === 'string' ? abstractText : (abstractText._ || '');
            }
          }
        } catch (e) {
          abstract = '';
        }

        // Get authors
        let authors = [];
        try {
          const authorList = article.MedlineCitation[0].Article[0].AuthorList;
          if (authorList && authorList[0] && authorList[0].Author) {
            authors = authorList[0].Author.map(x => {
              const last = x?.LastName?.[0] || '';
              const fore = x?.ForeName?.[0] || x?.Initials?.[0] || '';
              return `${fore} ${last}`.trim();
            }).filter(Boolean);
          }
        } catch (e) {
          authors = [];
        }

        return { 
          PMID: pmid.toString(), 
          DrugName: drugName.toString(), 
          Sponsor: sponsor.toString(),
          Title: title.toString(),
          Journal: journal.toString(),
          PublicationDate: publicationDate.toString(),
          Abstract: abstract.toString(),
          Authors: authors
        };
      });

      console.log('🔍 Processed articles:', drugArticles.length);

      // Process articles into format with PMID, title, drug name, and ALL article data
      const processedDrugs = drugArticles.map(article => ({
        pmid: article.PMID.toString(),
        title: article.Title.toString(),
        drugName: query, // Always use the search query as the drug name
        journal: article.Journal.toString(),
        publicationDate: article.PublicationDate.toString(),
        abstract: article.Abstract.toString(),
        authors: article.Authors,
        sponsor: article.Sponsor.toString()
      }));
      
      console.log('=== 🧪 Drug Discovery Results ===');
      console.log(`✅ Processed ${processedDrugs.length} drugs for AI inference`);
      console.log('📋 Sample results:', processedDrugs.slice(0, 3).map(d => ({
        pmid: d.pmid,
        drugName: d.drugName,
        titlePreview: d.title.substring(0, 100) + '...',
        journal: d.journal,
        authorsCount: d.authors?.length || 0,
        hasAbstract: !!d.abstract
      })));
      
      const result = {
        totalFound: processedDrugs.length,
        drugs: processedDrugs,
        searchDate: new Date().toISOString(),
        searchParams: { query, sponsor, frequency }
      };
      
      console.log('=== 📊 Discovery Summary ===');
      console.log('🎯 Returning discovery result:', {
        totalFound: result.totalFound,
        drugsCount: result.drugs.length,
        query: query,
        sponsor: sponsor,
        dateRange: `${effectiveDateFrom} to ${effectiveDateTo}`
      });
      
      return result;
    } catch (error) {
      console.error('Error discovering drugs:', error);
      throw new Error(`Drug discovery failed: ${error.message}`);
    }
  }

  // Helper method to extract clean drug names from MeSH terms or titles
  extractCleanDrugName(drugName, title) {
    if (!drugName || drugName === title) {
      // Extract potential drug names from title
      const drugPattern = /\b([A-Z][a-z]+(?:in|ol|ide|ine|ate|ant|ril|pam|zole|mab|nib))\b/g;
      const matches = title.match(drugPattern);
      return matches && matches.length > 0 ? matches[0] : title.substring(0, 50) + '...';
    }

    // If drugName contains MeSH terms, try to extract actual drug names
    if (drugName.includes(',')) {
      const terms = drugName.split(', ');
      const drugTerms = terms.filter(term => 
        /^[A-Z][a-z]+/.test(term) && 
        !['Humans', 'Male', 'Female', 'Aged', 'Adult', 'Middle', 'Young', 'Child'].includes(term)
      );
      return drugTerms.length > 0 ? drugTerms[0] : terms[0];
    }

    return drugName;
  }

  // Helper method to calculate confidence score
  calculateConfidence(article) {
    let confidence = 50; // Base confidence

    // Higher confidence if sponsor is present
    if (article.Sponsor) confidence += 20;

    // Higher confidence if drug name contains actual drug-like terms
    if (article.DrugName && /\b(in|ol|ide|ine|ate|ant|ril|pam|zole|mab|nib)\b/.test(article.DrugName)) {
      confidence += 15;
    }

    // Higher confidence for recent publications
    if (article.PublicationDate) {
      const pubYear = new Date(article.PublicationDate).getFullYear();
      const currentYear = new Date().getFullYear();
      if (currentYear - pubYear <= 2) confidence += 10;
    }

    return Math.min(100, confidence);
  }

  // Calculate date range based on frequency
  calculateFrequencyDateRange(frequency) {
    const now = new Date();
    let dateFrom = null;
    let dateTo = null;

    switch (frequency) {
      case 'daily':
        // Last 24 hours
        dateFrom = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        dateTo = now;
        break;
      case 'weekly':
        // Last 7 days
        dateFrom = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        dateTo = now;
        break;
      case 'monthly':
        // Last 30 days
        dateFrom = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        dateTo = now;
        break;
    }

    return {
      dateFrom: dateFrom ? this.formatDateForPubMed(dateFrom) : null,
      dateTo: dateTo ? this.formatDateForPubMed(dateTo) : null
    };
  }

  // Format date for PubMed API (YYYY/MM/DD)
  formatDateForPubMed(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}/${month}/${day}`;
  }

  // Generate PubMed query string for a drug
  generateDrugQuery(drugName, options = {}) {
    const { 
      includeAdverseEvents = true, 
      includeSafety = true, 
      includeToxicity = false 
    } = options;

    let queryParts = [`"${drugName}"[tiab]`];
    
    const safetyTerms = [];
    if (includeAdverseEvents) {
      safetyTerms.push('"adverse event"[tiab]', '"side effect"[tiab]');
    }
    if (includeSafety) {
      safetyTerms.push('"safety"[tiab]');
    }
    if (includeToxicity) {
      safetyTerms.push('"toxicity"[tiab]');
    }

    const drugQuery = queryParts.join(' OR ');
    const safetyQuery = safetyTerms.length ? ` AND (${safetyTerms.join(' OR ')})` : '';
    
    return `(${drugQuery})${safetyQuery}`;
  }

  // Helper method for safer XML parsing
  async safeParseXML(xml, context = 'unknown') {
    try {
      // Check if response is actually XML
      if (!xml.trim().startsWith('<')) {
        console.error(`Non-XML response in ${context}:`, xml.substring(0, 200));
        
        // Try to parse as JSON to see if it's an error response
        try {
          const jsonResponse = JSON.parse(xml);
          if (jsonResponse.error) {
            throw new Error(`API error in ${context}: ${jsonResponse.error}`);
          }
          throw new Error(`Unexpected JSON response in ${context}`);
        } catch (jsonError) {
          throw new Error(`Invalid response format in ${context}: expected XML, got non-XML data`);
        }
      }

      const parser = new xml2js.Parser();
      return await parser.parseStringPromise(xml);
    } catch (error) {
      console.error(`XML parsing error in ${context}:`, error.message);
      console.error(`Problematic content (first 500 chars):`, xml.substring(0, 500));
      throw new Error(`Failed to parse XML in ${context}: ${error.message}`);
    }
  }
}

module.exports = new PubMedService();
