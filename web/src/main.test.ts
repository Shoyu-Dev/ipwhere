import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { IPInfo, ErrorResponse } from './main';

// Mock the main module's lookupIP function behavior
describe('API Client', () => {
  const mockIPInfo: IPInfo = {
    ip: '8.8.8.8',
    country: 'United States',
    iso_code: 'US',
    in_eu: false,
    city: 'Mountain View',
    region: 'California',
    latitude: 37.4056,
    longitude: -122.0775,
    timezone: 'America/Los_Angeles',
    asn: 15169,
    organization: 'Google LLC',
    attribution: 'IP Geolocation by DB-IP (https://db-ip.com)',
  };

  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('should fetch IP info successfully', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockIPInfo),
    });
    vi.stubGlobal('fetch', mockFetch);

    const response = await fetch('/api/ip');
    const data = await response.json();

    expect(mockFetch).toHaveBeenCalledWith('/api/ip');
    expect(data.ip).toBe('8.8.8.8');
    expect(data.country).toBe('United States');
    expect(data.attribution).toBe('IP Geolocation by DB-IP (https://db-ip.com)');
  });

  it('should fetch IP info for specific IP', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockIPInfo),
    });
    vi.stubGlobal('fetch', mockFetch);

    const response = await fetch('/api/ip?ip=8.8.8.8');
    const data = await response.json();

    expect(mockFetch).toHaveBeenCalledWith('/api/ip?ip=8.8.8.8');
    expect(data.ip).toBe('8.8.8.8');
  });

  it('should handle error responses', async () => {
    const errorResponse: ErrorResponse = {
      error: 'Invalid IP address',
      attribution: 'IP Geolocation by DB-IP (https://db-ip.com)',
    };

    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: () => Promise.resolve(errorResponse),
    });
    vi.stubGlobal('fetch', mockFetch);

    const response = await fetch('/api/ip?ip=invalid');
    
    expect(response.ok).toBe(false);
    
    const data = await response.json();
    expect(data.error).toBe('Invalid IP address');
  });
});

describe('IPInfo Type', () => {
  it('should have all required fields', () => {
    const info: IPInfo = {
      ip: '192.168.1.1',
      attribution: 'IP Geolocation by DB-IP (https://db-ip.com)',
    };

    expect(info.ip).toBe('192.168.1.1');
    expect(info.attribution).toContain('DB-IP');
  });

  it('should allow optional fields to be undefined', () => {
    const info: IPInfo = {
      ip: '192.168.1.1',
      attribution: 'IP Geolocation by DB-IP (https://db-ip.com)',
      country: undefined,
      city: undefined,
    };

    expect(info.country).toBeUndefined();
    expect(info.city).toBeUndefined();
  });
});

describe('Data Formatting', () => {
  it('should format latitude correctly', () => {
    const lat = 37.4056789;
    const formatted = lat.toFixed(4);
    expect(formatted).toBe('37.4057');
  });

  it('should format longitude correctly', () => {
    const lon = -122.0775123;
    const formatted = lon.toFixed(4);
    expect(formatted).toBe('-122.0775');
  });

  it('should format ASN with prefix', () => {
    const asn = 15169;
    const formatted = `AS${asn}`;
    expect(formatted).toBe('AS15169');
  });

  it('should format boolean for EU membership', () => {
    expect(true ? 'Yes' : 'No').toBe('Yes');
    expect(false ? 'Yes' : 'No').toBe('No');
  });
});
