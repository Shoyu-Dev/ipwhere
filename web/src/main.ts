// API Response Types
export interface IPInfo {
  ip: string;
  country?: string;
  iso_code?: string;
  in_eu?: boolean;
  city?: string;
  region?: string;
  latitude?: number;
  longitude?: number;
  timezone?: string;
  asn?: number;
  organization?: string;
  attribution: string;
}

export interface ErrorResponse {
  error: string;
  attribution: string;
}

// API Client
export async function lookupIP(ip?: string): Promise<IPInfo> {
  const url = ip ? `/api/ip?ip=${encodeURIComponent(ip)}` : '/api/ip';
  
  const response = await fetch(url);
  
  if (!response.ok) {
    const errorData: ErrorResponse = await response.json();
    throw new Error(errorData.error || 'Failed to lookup IP');
  }
  
  return response.json();
}

// DOM Helpers
function getElementById<T extends HTMLElement>(id: string): T | null {
  return document.getElementById(id) as T | null;
}

function setText(id: string, value: string | number | boolean | undefined | null): void {
  const element = getElementById(id);
  if (element) {
    if (value === undefined || value === null || value === '') {
      element.textContent = '-';
    } else if (typeof value === 'boolean') {
      element.textContent = value ? 'Yes' : 'No';
    } else {
      element.textContent = String(value);
    }
  }
}

function showElement(id: string): void {
  const element = getElementById(id);
  if (element) {
    element.classList.remove('hidden');
  }
}

function hideElement(id: string): void {
  const element = getElementById(id);
  if (element) {
    element.classList.add('hidden');
  }
}

// UI State Management
function showLoading(): void {
  hideElement('results');
  hideElement('error');
  showElement('loading');
}

function showResults(data: IPInfo): void {
  hideElement('loading');
  hideElement('error');
  
  // Update all result fields
  setText('result-ip', data.ip);
  setText('result-country', data.country);
  setText('result-iso-code', data.iso_code);
  setText('result-in-eu', data.in_eu);
  setText('result-city', data.city);
  setText('result-region', data.region);
  setText('result-latitude', data.latitude?.toFixed(4));
  setText('result-longitude', data.longitude?.toFixed(4));
  setText('result-timezone', data.timezone);
  setText('result-asn', data.asn ? `AS${data.asn}` : undefined);
  setText('result-organization', data.organization);
  
  showElement('results');
}

function showError(message: string): void {
  hideElement('loading');
  hideElement('results');
  
  setText('error-message', message);
  showElement('error');
}

// Event Handlers
async function handleLookup(ip?: string): Promise<void> {
  showLoading();
  
  try {
    const data = await lookupIP(ip);
    showResults(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'An unexpected error occurred';
    showError(message);
  }
}

function handleFormSubmit(event: Event): void {
  event.preventDefault();
  
  const input = getElementById<HTMLInputElement>('ip-input');
  const ip = input?.value.trim();
  
  handleLookup(ip || undefined);
}

// Initialize
function init(): void {
  const form = getElementById<HTMLFormElement>('lookup-form');
  if (form) {
    form.addEventListener('submit', handleFormSubmit);
  }
  
  // Auto-lookup on page load
  handleLookup();
}

// Start when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
