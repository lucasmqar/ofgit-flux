import { User, UserRole, WHATSAPP_NUMBER } from '@/types';

export const WHATSAPP_BASE_URL = `https://wa.me/${WHATSAPP_NUMBER}`;

const roleLabels: Record<UserRole, string> = {
  admin: 'Administrador',
  company: 'Empresa',
  driver: 'Entregador',
};

/**
 * Generate WhatsApp link for adding credits
 */
export const getAddCreditsWhatsAppUrl = (user: User): string => {
  const message = encodeURIComponent(
    `Olá, gostaria de adicionar créditos no aplicativo FLUX.\n\nNome do usuário: ${user.name}\nPerfil: ${roleLabels[user.role]}\nID do usuário: ${user.id}`
  );
  return `${WHATSAPP_BASE_URL}?text=${message}`;
};

/**
 * Generate WhatsApp link for support
 */
export const getSupportWhatsAppUrl = (user: User, currentScreen: string): string => {
  const message = encodeURIComponent(
    `Olá, preciso de suporte no aplicativo FLUX.\n\nUsuário: ${user.name}\nPerfil: ${roleLabels[user.role]}\nTela atual: ${currentScreen}`
  );
  return `${WHATSAPP_BASE_URL}?text=${message}`;
};

/**
 * Generate WhatsApp link for contacting driver (from company)
 */
export const getDriverWhatsAppUrl = (driverPhone: string, orderCode: string): string => {
  const message = encodeURIComponent(
    `Olá, sou da empresa e gostaria de falar sobre o pedido ${orderCode}.`
  );
  return `https://wa.me/55${driverPhone.replace(/\D/g, '')}?text=${message}`;
};

/**
 * Generate WhatsApp link for contacting company (from driver)
 */
export const getCompanyWhatsAppUrl = (companyPhone: string, orderCode: string): string => {
  const message = encodeURIComponent(
    `Olá, sou o entregador do pedido ${orderCode}.`
  );
  return `https://wa.me/55${companyPhone.replace(/\D/g, '')}?text=${message}`;
};

/**
 * Generate WhatsApp link for delivery problems (entregador)
 */
export const getDeliveryProblemWhatsAppUrl = (orderCode: string): string => {
  const message = encodeURIComponent(
    `Olá, estou com um problema no pedido ${orderCode}.`
  );
  return `${WHATSAPP_BASE_URL}?text=${message}`;
};

/**
 * Generate WhatsApp link for order help (empresa)
 */
export const getOrderHelpWhatsAppUrl = (orderCode: string): string => {
  const message = encodeURIComponent(
    `Olá, preciso de ajuda com o pedido ${orderCode}.`
  );
  return `${WHATSAPP_BASE_URL}?text=${message}`;
};

/**
 * Open WhatsApp with the given URL
 */
export const openWhatsApp = (url: string): void => {
  window.open(url, '_blank', 'noopener,noreferrer');
};
