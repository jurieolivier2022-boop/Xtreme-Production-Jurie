import React, { useEffect, useRef, useState } from 'react';
import { APIProvider, useMapsLibrary } from '@vis.gl/react-google-maps';
import { MapPin, AlertCircle, ExternalLink, Check } from 'lucide-react';
import { cn } from '../lib/utils';

const API_KEY = process.env.GOOGLE_MAPS_PLATFORM_KEY || '';
const hasValidKey = Boolean(API_KEY) && API_KEY !== 'YOUR_API_KEY';

interface AddressInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

function AutocompleteInput({ value, onChange, placeholder, className }: AddressInputProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<{ status: 'success' | 'warning' | 'error', message: string } | null>(null);
  
  const searchInputRef = useRef<HTMLInputElement>(null);
  const placesLib = useMapsLibrary('places');
  const validationLib = useMapsLibrary('addressValidation' as any) as any;

  useEffect(() => {
    if (!placesLib || !searchInputRef.current) return;

    const options = {
      fields: ['formatted_address', 'geometry', 'name'],
      strictBounds: false,
    };

    const autocomplete = new placesLib.Autocomplete(searchInputRef.current, options);

    autocomplete.addListener('place_changed', () => {
      const place = autocomplete.getPlace();
      if (place.formatted_address) {
        onChange(place.formatted_address);
        setSearchQuery('');
        setValidationResult(null);
      }
    });

    return () => {
      if (window.google && window.google.maps && window.google.maps.event) {
        window.google.maps.event.clearInstanceListeners(autocomplete);
      }
    };
  }, [placesLib, onChange]);

  const handleValidate = async () => {
    if (!validationLib || !value) return;
    
    setIsValidating(true);
    setValidationResult(null);
    
    try {
      const response = await validationLib.AddressValidation.fetchAddressValidation({
        address: { addressLines: value.split('\n') }
      });

      const { verdict } = response as any;
      if (verdict?.addressComplete) {
        setValidationResult({ status: 'success', message: 'Address is complete and verified.' });
      } else if (verdict?.validationGranularity === 'PREMISE') {
        setValidationResult({ status: 'success', message: 'Building found, but some details might be missing.' });
      } else {
        setValidationResult({ status: 'warning', message: 'Address might be incomplete or ambiguous.' });
      }
    } catch (err) {
      setValidationResult({ status: 'error', message: 'Could not validate address at this time.' });
    } finally {
      setIsValidating(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="relative group">
        <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
          <MapPin size={16} className="text-brand opacity-40 group-focus-within:opacity-100 transition-all" />
        </div>
        <input
          ref={searchInputRef}
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search for business address..."
          className="w-full pl-12 pr-4 py-4 bg-white border border-border rounded-xl font-bold text-xs focus:ring-4 focus:ring-brand/5 focus:border-brand transition-all shadow-inner"
        />
      </div>

      <div className="relative group">
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={cn(
            "w-full px-6 py-4 bg-gray-50 border border-border rounded-2xl font-bold focus:ring-4 focus:ring-brand/5 focus:border-brand transition-all h-32 resize-none",
            className
          )}
        />
        
        <div className="absolute right-4 bottom-4 flex items-center gap-2">
          {validationResult && (
            <div className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest animate-in fade-in zoom-in-95 duration-300",
              validationResult.status === 'success' && "bg-emerald-50 text-emerald-600 border border-emerald-100",
              validationResult.status === 'warning' && "bg-amber-50 text-amber-600 border border-amber-100",
              validationResult.status === 'error' && "bg-rose-50 text-rose-600 border border-rose-100"
            )}>
              {validationResult.status === 'success' && <Check size={12} />}
              {validationResult.status === 'warning' && <AlertCircle size={12} />}
              {validationResult.message}
            </div>
          )}
          
          <button
            type="button"
            onClick={handleValidate}
            disabled={isValidating || !value}
            className="px-4 py-2 bg-white border border-border rounded-xl text-[10px] font-black uppercase tracking-widest text-text-light hover:text-brand hover:border-brand transition-all shadow-sm active:scale-95 disabled:opacity-50"
          >
            {isValidating ? 'Validating...' : 'Validate Address'}
          </button>
        </div>
      </div>
    </div>
  );
}

export function AddressInput(props: AddressInputProps) {
  if (!hasValidKey) {
    return (
      <div className="space-y-4">
        <div className="relative group">
          <MapPin size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-light opacity-40" />
          <textarea
            value={props.value}
            onChange={(e) => props.onChange(e.target.value)}
            placeholder={props.placeholder}
            className={cn(
              "w-full pl-12 pr-4 py-4 bg-gray-50 border border-border rounded-2xl font-bold focus:ring-4 focus:ring-brand/5 focus:border-brand transition-all h-32 resize-none",
              props.className
            )}
          />
        </div>
        
        <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 flex gap-4 items-start animate-in fade-in slide-in-from-top-2 duration-500">
          <div className="w-8 h-8 rounded-xl bg-white flex items-center justify-center text-amber-600 shadow-sm shrink-0 mt-0.5">
            <AlertCircle size={16} />
          </div>
          <div className="space-y-1">
            <p className="text-[10px] font-black text-amber-900 uppercase tracking-widest">Enhanced Location Search</p>
            <p className="text-[11px] font-bold text-amber-800/70 leading-relaxed italic">
              Connect Google Maps to enable address autocomplete and smart location validation.
            </p>
            <div className="pt-2 flex gap-4">
              <a 
                href="https://console.cloud.google.com/google/maps-apis/start" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-[10px] font-black text-brand uppercase tracking-widest flex items-center gap-1 hover:underline underline-offset-4"
              >
                Get API Key <ExternalLink size={10} />
              </a>
              <span className="text-[10px] font-medium text-amber-800/40"> Add to Secrets: GOOGLE_MAPS_PLATFORM_KEY </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <APIProvider apiKey={API_KEY} version="weekly">
      <AutocompleteInput {...props} />
    </APIProvider>
  );
}
