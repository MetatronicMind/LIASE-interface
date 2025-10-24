import React from 'react';
import { ArrowTopRightOnSquareIcon } from '@heroicons/react/24/outline';

interface PmidLinkProps {
  pmid: string;
  className?: string;
  showIcon?: boolean;
  iconClassName?: string;
}

/**
 * Reusable component for displaying PMID as a hyperlink to PubMed
 * @param pmid - The PubMed ID
 * @param className - Optional CSS classes for the link
 * @param showIcon - Whether to show an external link icon
 * @param iconClassName - Optional CSS classes for the icon
 */
export const PmidLink: React.FC<PmidLinkProps> = ({ 
  pmid, 
  className = 'text-blue-600 hover:underline font-mono',
  showIcon = false,
  iconClassName = 'w-3 h-3 ml-1 inline-block'
}) => {
  if (!pmid) {
    return <span className="text-gray-400">N/A</span>;
  }

  return (
    <a
      href={`https://pubmed.ncbi.nlm.nih.gov/${pmid}`}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
      title={`View study on PubMed: ${pmid}`}
    >
      {pmid}
      {showIcon && (
        <ArrowTopRightOnSquareIcon className={iconClassName} />
      )}
    </a>
  );
};

export default PmidLink;
