import { INSTITUTIONAL_SITE_URL } from '@/types';

export const openInstitutionalSite = (): void => {
  window.open(INSTITUTIONAL_SITE_URL, '_blank', 'noopener,noreferrer');
};
