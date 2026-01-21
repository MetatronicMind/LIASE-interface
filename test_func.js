const xml2js = require('xml2js');

// Step 1: Search for articles related to drugs
async function getDrugArticles(term, maxResults = 10) {
    const searchUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=${encodeURIComponent(term)}&retmax=${maxResults}&retmode=json`;
    const searchResp = await fetch(searchUrl);
    const searchJson = await searchResp.json();
    const ids = searchJson.esearchresult.idlist.join(',');

    // 2. Fetch article details with efetch
    const fetchUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pubmed&id=${ids}&retmode=xml`;
    const fetchResp = await fetch(fetchUrl);
    const xml = await fetchResp.text();

    // 3. Parse the XML response
    const parser = new xml2js.Parser();
    const articles = await parser.parseStringPromise(xml);

    // 4. Extract PMID, Drug Name, Sponsor if present
    return articles.PubmedArticleSet.PubmedArticle.map(article => {
        // PMID
        const pmid = article.MedlineCitation[0].PMID[0];

        // Drug Name: try MeSH Headings first, else ArticleTitle
        let drugName = '';
        if (article.MedlineCitation[0].MeshHeadingList && article.MedlineCitation[0].MeshHeadingList[0].MeshHeading) {
            const descriptor = article.MedlineCitation[0].MeshHeadingList[0].MeshHeading
                .map(mh => mh.DescriptorName && mh.DescriptorName[0]._)
                .filter(Boolean);
            drugName = descriptor.join(', ');
        } else if (article.MedlineCitation[0].Article[0].ArticleTitle) {
            drugName = article.MedlineCitation[0].Article[0].ArticleTitle[0];
        }

        // Sponsor (from GrantList, if available)
        let sponsor = '';
        if (
            article.MedlineCitation[0].GrantList &&
            article.MedlineCitation[0].GrantList[0].Grant &&
            article.MedlineCitation[0].GrantList[0].Grant[0].Agency
        ) {
            sponsor = article.MedlineCitation[0].GrantList[0].Grant[0].Agency[0];
        }

        return { PMID: pmid, DrugName: drugName, Sponsor: sponsor };
    });
}

// Usage Example
getDrugArticles('drug')
    .then(articles => console.log(articles))
    .catch(err => console.error(err));
