export const generateArticleDisplayId = (study: { 
  drugName?: string; 
  pmid?: string; 
  createdAt?: string; 
  id?: string; 
}): string => {
  if (!study) return '';
  
  // DRUG NAME: First 4 characters of the first word, uppercase
  const drugRef = study.drugName 
    ? study.drugName.split(/[\s-\/]/)[0].toUpperCase().substring(0, 4)
    : 'UNKN';
    
  // PMID: The PubMed ID
  const pmidRef = study.pmid || study.id || '0000';

  // TIME/RANDOM: Last 4 digits of timestamp or random
  let timeRef = '0000';
  if (study.createdAt) {
    timeRef = new Date(study.createdAt).getTime().toString().slice(-4);
  } else {
    // Fallback if no date
    timeRef = Math.floor(Math.random() * 9000 + 1000).toString();
  }

  return `${drugRef}_${pmidRef}_${timeRef}`;
};
