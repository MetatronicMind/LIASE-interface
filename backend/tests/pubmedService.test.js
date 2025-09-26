// Load test environment variables
require('dotenv').config({ path: '.env.test' });

const axios = require('axios');
const pubmedService = require('../src/services/pubmedService');

// Mock axios
jest.mock('axios');
const mockedAxios = axios;

describe('PubMed Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('buildParams', () => {
    it('should build basic parameters', () => {
      const params = pubmedService.buildParams({ db: 'pubmed' });
      expect(params).toHaveProperty('db', 'pubmed');
      expect(params).toHaveProperty('tool');
    });

    it('should include email if set', () => {
      process.env.PUBMED_EMAIL = 'test@example.com';
      const params = pubmedService.buildParams();
      expect(params).toHaveProperty('email', 'test@example.com');
      delete process.env.PUBMED_EMAIL;
    });
  });

  describe('search', () => {
    it('should search PubMed successfully', async () => {
      const mockResponse = {
        data: {
          esearchresult: {
            idlist: ['12345678', '87654321']
          }
        }
      };
      mockedAxios.get.mockResolvedValue(mockResponse);

      const result = await pubmedService.search('ibuprofen adverse events');
      
      expect(mockedAxios.get).toHaveBeenCalledWith(
        'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi',
        expect.objectContaining({
          params: expect.objectContaining({
            db: 'pubmed',
            term: 'ibuprofen adverse events',
            retmode: 'json',
            retmax: 50,
            sort: 'relevance'
          })
        })
      );
      expect(result).toEqual(['12345678', '87654321']);
    });

    it('should handle search with options', async () => {
      const mockResponse = {
        data: {
          esearchresult: {
            idlist: ['12345678']
          }
        }
      };
      mockedAxios.get.mockResolvedValue(mockResponse);

      await pubmedService.search('aspirin', {
        maxResults: 10,
        dateFrom: '2020/01/01',
        dateTo: '2023/12/31'
      });

      expect(mockedAxios.get).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          params: expect.objectContaining({
            retmax: 10,
            mindate: '2020/01/01',
            maxdate: '2023/12/31'
          })
        })
      );
    });

    it('should return empty array if no results', async () => {
      const mockResponse = {
        data: {
          esearchresult: {}
        }
      };
      mockedAxios.get.mockResolvedValue(mockResponse);

      const result = await pubmedService.search('nonexistent drug');
      expect(result).toEqual([]);
    });

    it('should handle API errors', async () => {
      mockedAxios.get.mockRejectedValue(new Error('API Error'));

      await expect(pubmedService.search('test query')).rejects.toThrow('API Error');
    });
  });

  describe('fetchDetails', () => {
    it('should fetch article details successfully', async () => {
      const mockXmlResponse = `
        <PubmedArticleSet>
          <PubmedArticle>
            <MedlineCitation>
              <PMID>12345678</PMID>
              <Article>
                <ArticleTitle>Test Article Title</ArticleTitle>
                <Abstract>
                  <AbstractText>This is a test abstract.</AbstractText>
                </Abstract>
                <AuthorList>
                  <Author>
                    <LastName>Smith</LastName>
                    <ForeName>John</ForeName>
                  </Author>
                  <Author>
                    <LastName>Doe</LastName>
                    <ForeName>Jane</ForeName>
                  </Author>
                </AuthorList>
                <Journal>
                  <Title>Test Journal</Title>
                  <JournalIssue>
                    <PubDate>
                      <Year>2023</Year>
                    </PubDate>
                  </JournalIssue>
                </Journal>
              </Article>
            </MedlineCitation>
          </PubmedArticle>
        </PubmedArticleSet>
      `;

      mockedAxios.get.mockResolvedValue({ data: mockXmlResponse });

      const result = await pubmedService.fetchDetails(['12345678']);

      expect(mockedAxios.get).toHaveBeenCalledWith(
        'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi',
        expect.objectContaining({
          params: expect.objectContaining({
            db: 'pubmed',
            id: '12345678',
            retmode: 'xml'
          })
        })
      );

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        pmid: '12345678',
        title: 'Test Article Title',
        journal: 'Test Journal',
        abstract: 'This is a test abstract.',
        authors: ['John Smith', 'Jane Doe'],
        publicationDate: '2023-01-01'
      });
    });

    it('should return empty array for empty input', async () => {
      const result = await pubmedService.fetchDetails([]);
      expect(result).toEqual([]);
      expect(mockedAxios.get).not.toHaveBeenCalled();
    });

    it('should handle malformed XML', async () => {
      mockedAxios.get.mockResolvedValue({ data: 'invalid xml' });

      await expect(pubmedService.fetchDetails(['12345678'])).rejects.toThrow();
    });

    it('should handle multiple articles', async () => {
      const mockXmlResponse = `
        <PubmedArticleSet>
          <PubmedArticle>
            <MedlineCitation>
              <PMID>12345678</PMID>
              <Article>
                <ArticleTitle>Article 1</ArticleTitle>
                <Journal><Title>Journal 1</Title></Journal>
              </Article>
            </MedlineCitation>
          </PubmedArticle>
          <PubmedArticle>
            <MedlineCitation>
              <PMID>87654321</PMID>
              <Article>
                <ArticleTitle>Article 2</ArticleTitle>
                <Journal><Title>Journal 2</Title></Journal>
              </Article>
            </MedlineCitation>
          </PubmedArticle>
        </PubmedArticleSet>
      `;

      mockedAxios.get.mockResolvedValue({ data: mockXmlResponse });

      const result = await pubmedService.fetchDetails(['12345678', '87654321']);
      
      expect(result).toHaveLength(2);
      expect(result[0].pmid).toBe('12345678');
      expect(result[1].pmid).toBe('87654321');
    });
  });

  describe('mapArticle', () => {
    it('should map article with all fields', () => {
      const mockArticle = {
        MedlineCitation: {
          PMID: '12345678',
          Article: {
            ArticleTitle: 'Test Title',
            Abstract: {
              AbstractText: 'Test abstract content'
            },
            AuthorList: {
              Author: [
                { LastName: 'Smith', ForeName: 'John' },
                { LastName: 'Doe', ForeName: 'Jane' }
              ]
            },
            Journal: {
              Title: 'Test Journal',
              JournalIssue: {
                PubDate: {
                  Year: '2023'
                }
              }
            }
          }
        }
      };

      const result = pubmedService.mapArticle(mockArticle);

      expect(result).toMatchObject({
        pmid: '12345678',
        title: 'Test Title',
        journal: 'Test Journal',
        abstract: 'Test abstract content',
        authors: ['John Smith', 'Jane Doe'],
        publicationDate: '2023-01-01'
      });
    });

    it('should handle missing fields gracefully', () => {
      const mockArticle = {
        MedlineCitation: {
          PMID: '12345678',
          Article: {}
        }
      };

      const result = pubmedService.mapArticle(mockArticle);

      expect(result).toMatchObject({
        pmid: '12345678',
        title: '',
        journal: '',
        abstract: '',
        authors: []
      });
    });

    it('should return null for invalid article', () => {
      const result = pubmedService.mapArticle(null);
      expect(result).toEqual({
        pmid: '',
        title: '',
        journal: '',
        abstract: '',
        authors: [],
        publicationDate: '-01-01'
      });
    });

    it('should handle single author', () => {
      const mockArticle = {
        MedlineCitation: {
          PMID: '12345678',
          Article: {
            AuthorList: {
              Author: { LastName: 'Smith', ForeName: 'John' }
            }
          }
        }
      };

      const result = pubmedService.mapArticle(mockArticle);
      expect(result.authors).toEqual(['John Smith']);
    });

    it('should handle complex abstract with multiple sections', () => {
      const mockArticle = {
        MedlineCitation: {
          PMID: '12345678',
          Article: {
            Abstract: {
              AbstractText: [
                'Background: This is background.',
                'Methods: This is methods.',
                'Results: This is results.'
              ]
            }
          }
        }
      };

      const result = pubmedService.mapArticle(mockArticle);
      expect(result.abstract).toBe('Background: This is background.\nMethods: This is methods.\nResults: This is results.');
    });
  });
});