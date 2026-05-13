import React, { useState, useEffect, useRef } from 'react';
import { Settings, Save, AlertCircle, Database, Check, Percent, Banknote, Layers, Building2, Mail, Phone, MapPin, Globe, CreditCard, Upload } from 'lucide-react';
import { useCollection, updateDocument, createDocument, setDocument } from '../lib/firestoreService';
import { PricingSettings, CompanySettings } from '../types';
import { DEFAULT_PRICING_SETTINGS } from '../lib/pricingService';
import { cn } from '../lib/utils';
import { AddressInput } from '../components/AddressInput';

const SETTINGS_COLLECTION = 'settings';

const DEFAULT_COMPANY_SETTINGS: CompanySettings = {
  id: 'company',
  name: '',
  email: '',
  phone: '',
  address: '',
  vatNumber: '',
  registrationNumber: '',
  bankName: '',
  accountNumber: '',
  branchCode: '',
  website: '',
  logoUrl: '',
  quoteEmailTemplate: `Hi {{clientName}},\n\nHere is your quote {{quoteNumber}} from {{companyName}}.\n\nSummary:\n{{itemsSummary}}\n\nTotal: {{totalAmount}}\n\nYou can view and approve the quote here: {{approvalUrl}}\n\nRegards,\n{{companyName}}`,
  quoteWhatsappTemplate: `Hi {{clientName}},\n\nHere is your quote {{quoteNumber}} from {{companyName}}.\n\nTotal: {{totalAmount}}\n\nView here: {{approvalUrl}}`,
  jobEmailTemplate: `Hi {{clientName}},\n\nUpdate on your order {{jobNumber}} from {{companyName}}:\n\nCurrent Stage: {{jobStage}}\nProduct: {{productName}}\nEstimated Completion: {{dueDate}}\n\nTrack your order status here: {{trackingUrl}}\n\nRegards,\n{{companyName}}`,
  jobWhatsappTemplate: `Hi {{clientName}},\n\nUpdate on your order {{jobNumber}} from {{companyName}}.\nStage: {{jobStage}}\nReady: {{dueDate}}\n\nTrack: {{trackingUrl}}`,
  artworkEmailTemplate: `Hi {{clientName}},\n\nYour artwork for order {{jobNumber}} is ready for review!\n\nYou can view and approve the artwork here: {{approvalUrl}}\n\nPlease let us know if any changes are required.\n\nRegards,\n{{companyName}}`,
  artworkWhatsappTemplate: `Hi {{clientName}},\n\nYour artwork for order {{jobNumber}} is ready! 🎨\n\nView and approve here: {{approvalUrl}}`
};

export default function SettingsPage() {
  const { data: settingsList, loading: loadingPricing } = useCollection<PricingSettings>(SETTINGS_COLLECTION);
  const { data: companyList, loading: loadingCompany } = useCollection<CompanySettings>('company_settings');
  
  const [activeTab, setActiveTab] = useState<'company' | 'pricing' | 'messaging'>('company');
  const [pricing, setPricing] = useState<PricingSettings>(DEFAULT_PRICING_SETTINGS);
  const [company, setCompany] = useState<CompanySettings>(DEFAULT_COMPANY_SETTINGS);
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.includes('jpeg') && !file.type.includes('jpg')) {
      alert('Please upload a JPEG image.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64String = event.target?.result as string;
      setCompany(prev => ({ ...prev, logoUrl: base64String }));
    };
    reader.readAsDataURL(file);
  };

  useEffect(() => {
    if (settingsList.length > 0) {
      const p = settingsList.find(s => s.id === 'pricing') || settingsList[0];
      setPricing({ ...DEFAULT_PRICING_SETTINGS, ...p });
    }
  }, [settingsList]);

  useEffect(() => {
    if (companyList.length > 0) {
      const c = companyList.find(s => s.id === 'company') || companyList[0];
      setCompany({ ...DEFAULT_COMPANY_SETTINGS, ...c });
    }
  }, [companyList]);

  const handleSavePricing = async () => {
    console.log('Button Click: Commit Pricing Logic');
    setIsSaving(true);
    try {
      await setDocument(SETTINGS_COLLECTION, 'pricing', pricing);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (error) {
      console.error('Error saving pricing:', error);
      alert('Failed to save pricing settings.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveCompany = async () => {
    console.log('Button Click: Update Business Profile');
    setIsSaving(true);
    try {
      await setDocument('company_settings', 'company', company);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (error) {
      console.error('Error saving company profile:', error);
      alert('Failed to save business profile.');
    } finally {
      setIsSaving(false);
    }
  };

  if (loadingPricing || loadingCompany) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-brand/20 border-t-brand rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-10 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-text-main tracking-tighter uppercase italic">System Settings</h1>
          <p className="text-[10px] font-black text-text-light uppercase tracking-[0.3em] mt-2">Global configuration & business profile</p>
        </div>
        <div className="flex bg-surface p-1 rounded-2xl border border-border/50 self-start md:self-center">
          <button 
            onClick={() => setActiveTab('company')}
            className={cn(
              "px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
              activeTab === 'company' ? "bg-white text-brand shadow-sm" : "text-text-light hover:text-text-main"
            )}
          >
            Business Profile
          </button>
          <button 
            onClick={() => setActiveTab('pricing')}
            className={cn(
              "px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
              activeTab === 'pricing' ? "bg-white text-brand shadow-sm" : "text-text-light hover:text-text-main"
            )}
          >
            Pricing Engine
          </button>
          <button 
            onClick={() => setActiveTab('messaging')}
            className={cn(
              "px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
              activeTab === 'messaging' ? "bg-white text-brand shadow-sm" : "text-text-light hover:text-text-main"
            )}
          >
            Messaging
          </button>
        </div>
      </div>

      {activeTab === 'company' ? (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-10">
          <div className="xl:col-span-2 space-y-10">
            <div className="card-minimal">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 rounded-2xl bg-brand/5 flex items-center justify-center text-brand">
                  <Building2 size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-text-main uppercase tracking-tight italic">Company Details</h3>
                  <p className="text-[10px] font-black text-text-light uppercase tracking-widest">Primary business identification</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-text-light uppercase tracking-widest ml-1">Company Name</label>
                  <div className="relative">
                    <Building2 size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-light opacity-40" />
                    <input 
                      type="text" 
                      value={company.name}
                      onChange={(e) => setCompany({ ...company, name: e.target.value })}
                      placeholder="XPress Print Solutions"
                      className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-border rounded-2xl font-bold focus:ring-4 focus:ring-brand/5 focus:border-brand transition-all"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-text-light uppercase tracking-widest ml-1">VAT Number</label>
                  <div className="relative">
                    <Check size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-light opacity-40" />
                    <input 
                      type="text" 
                      value={company.vatNumber}
                      onChange={(e) => setCompany({ ...company, vatNumber: e.target.value })}
                      placeholder="4012345678"
                      className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-border rounded-2xl font-bold focus:ring-4 focus:ring-brand/5 focus:border-brand transition-all"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-text-light uppercase tracking-widest ml-1">Registration No.</label>
                  <input 
                    type="text" 
                    value={company.registrationNumber}
                    onChange={(e) => setCompany({ ...company, registrationNumber: e.target.value })}
                    placeholder="2023/123456/07"
                    className="w-full px-6 py-4 bg-gray-50 border border-border rounded-2xl font-bold focus:ring-4 focus:ring-brand/5 focus:border-brand transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-text-light uppercase tracking-widest ml-1">Website</label>
                  <div className="relative">
                    <Globe size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-light opacity-40" />
                    <input 
                      type="text" 
                      value={company.website}
                      onChange={(e) => setCompany({ ...company, website: e.target.value })}
                      placeholder="www.xpressprint.co.za"
                      className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-border rounded-2xl font-bold focus:ring-4 focus:ring-brand/5 focus:border-brand transition-all"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="card-minimal">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-600">
                  <Mail size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-text-main uppercase tracking-tight italic">Contact & Location</h3>
                  <p className="text-[10px] font-black text-text-light uppercase tracking-widest">Public facing contact information</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-text-light uppercase tracking-widest ml-1">Support Email</label>
                  <div className="relative">
                    <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-light opacity-40" />
                    <input 
                      type="email" 
                      value={company.email}
                      onChange={(e) => setCompany({ ...company, email: e.target.value })}
                      placeholder="info@xpressprint.com"
                      className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-border rounded-2xl font-bold focus:ring-4 focus:ring-brand/5 focus:border-brand transition-all"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-text-light uppercase tracking-widest ml-1">Phone Number</label>
                  <div className="relative">
                    <Phone size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-light opacity-40" />
                    <input 
                      type="text" 
                      value={company.phone}
                      onChange={(e) => setCompany({ ...company, phone: e.target.value })}
                      placeholder="+27 11 123 4567"
                      className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-border rounded-2xl font-bold focus:ring-4 focus:ring-brand/5 focus:border-brand transition-all"
                    />
                  </div>
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className="text-[10px] font-black text-text-light uppercase tracking-widest ml-1">Business Address</label>
                  <AddressInput 
                    value={company.address}
                    onChange={(val) => setCompany({ ...company, address: val })}
                    placeholder="123 Printing Way, Industrial Area, Cape Town"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-10">
            <div className="card-minimal h-fit">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                  <CreditCard size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-text-main uppercase tracking-tight italic">Banking</h3>
                  <p className="text-[10px] font-black text-text-light uppercase tracking-widest">Invoicing details</p>
                </div>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-text-light uppercase tracking-widest ml-1">Bank Name</label>
                  <input 
                    type="text" 
                    value={company.bankName}
                    onChange={(e) => setCompany({ ...company, bankName: e.target.value })}
                    className="w-full px-6 py-4 bg-gray-50 border border-border rounded-2xl font-bold"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-text-light uppercase tracking-widest ml-1">Account Number</label>
                  <input 
                    type="text" 
                    value={company.accountNumber}
                    onChange={(e) => setCompany({ ...company, accountNumber: e.target.value })}
                    className="w-full px-6 py-4 bg-gray-50 border border-border rounded-2xl font-bold"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-text-light uppercase tracking-widest ml-1">Branch Code</label>
                  <input 
                    type="text" 
                    value={company.branchCode}
                    onChange={(e) => setCompany({ ...company, branchCode: e.target.value })}
                    className="w-full px-6 py-4 bg-gray-50 border border-border rounded-2xl font-bold"
                  />
                </div>
              </div>
            </div>

            <div className="card-minimal">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                  <Globe size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-text-main uppercase tracking-tight italic">Branding</h3>
                  <p className="text-[10px] font-black text-text-light uppercase tracking-widest">Logo and visual identity</p>
                </div>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-text-light uppercase tracking-widest ml-1">Company Logo</label>
                  <input 
                    type="file"
                    ref={fileInputRef}
                    onChange={handleLogoUpload}
                    accept=".jpg,.jpeg,image/jpeg"
                    className="hidden"
                  />
                  
                  <div className="flex flex-col gap-4">
                    <button 
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-surface border border-brand/20 border-dashed rounded-2xl text-[10px] font-black uppercase tracking-widest text-brand hover:bg-brand/5 transition-all group"
                    >
                      <Upload size={16} className="group-hover:-translate-y-0.5 transition-transform" />
                      {company.logoUrl ? 'Change Company Logo' : 'Upload Company Logo'}
                    </button>
                    <p className="text-[10px] font-bold text-text-muted italic px-2">Recommended: JPEG format with a white or transparent background. Max size 1MB.</p>
                  </div>
                </div>
                
                {company.logoUrl && (
                  <div className="p-8 bg-paper border border-border border-dashed rounded-[2.5rem] flex flex-col items-center justify-center gap-6 relative group overflow-hidden">
                    <div className="absolute inset-0 grid-structure opacity-[0.03] pointer-events-none" />
                    <button 
                      onClick={() => setCompany(prev => ({ ...prev, logoUrl: '' }))}
                      className="absolute top-4 right-4 p-2 bg-red-50 text-red-500 rounded-xl opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500 hover:text-white"
                      title="Remove Logo"
                    >
                      <AlertCircle size={14} />
                    </button>
                    <p className="text-[9px] font-black text-text-light uppercase tracking-[0.2em] relative z-10">Live Branding Preview</p>
                    <div className="relative z-10 p-4 bg-white rounded-xl shadow-sm border border-border/50">
                      <img 
                        src={company.logoUrl} 
                        alt="Company Logo Preview" 
                        className="max-h-32 object-contain"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-4">
              <button 
                onClick={handleSaveCompany}
                disabled={isSaving}
                className="w-full py-5 bg-brand text-white rounded-3xl font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-brand/20 hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-3"
              >
                {isSaving ? <Check className="animate-spin" /> : <Save size={18} />}
                Update Business Profile
              </button>
            </div>
          </div>
        </div>
      ) : activeTab === 'pricing' ? (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-10 pb-20">
           <div className="flex flex-col gap-10">
              <div className="card-minimal">
                <div className="flex items-center gap-4 mb-8">
                  <div className="w-12 h-12 rounded-2xl bg-orange-50 flex items-center justify-center text-orange-600">
                    <AlertCircle size={24} />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-text-main uppercase tracking-tight italic">Express Rush Service</h3>
                    <p className="text-[10px] font-black text-text-light uppercase tracking-widest">Urgent turnaround premiums</p>
                  </div>
                </div>

                <div className="space-y-8">
                  <div>
                    <label className="block text-[10px] font-black text-text-light uppercase tracking-widest mb-4 ml-1">Calculation Method</label>
                    <div className="grid grid-cols-2 gap-4">
                      <button 
                        onClick={() => setPricing({ ...pricing, expressSurchargeType: 'percentage' })}
                        className={cn(
                          "flex flex-col items-center gap-4 p-6 rounded-[2rem] border-2 transition-all p-8",
                          pricing.expressSurchargeType === 'percentage' 
                            ? "border-brand bg-blue-50/50" 
                            : "border-border hover:border-brand/40 bg-white"
                        )}
                      >
                        <div className={cn(
                          "w-12 h-12 rounded-xl flex items-center justify-center shadow-lg",
                          pricing.expressSurchargeType === 'percentage' ? "bg-brand text-white" : "bg-gray-100 text-text-light"
                        )}>
                          <Percent size={24} />
                        </div>
                        <div className="text-center">
                          <p className="font-black text-[11px] uppercase tracking-widest text-text-main">Percentage</p>
                        </div>
                      </button>

                      <button 
                        onClick={() => setPricing({ ...pricing, expressSurchargeType: 'flat' })}
                        className={cn(
                          "flex flex-col items-center gap-4 p-6 rounded-[2rem] border-2 transition-all p-8",
                          pricing.expressSurchargeType === 'flat' 
                            ? "border-brand bg-blue-50/50" 
                            : "border-border hover:border-brand/40 bg-white"
                        )}
                      >
                        <div className={cn(
                          "w-12 h-12 rounded-xl flex items-center justify-center shadow-lg",
                          pricing.expressSurchargeType === 'flat' ? "bg-brand text-white" : "bg-gray-100 text-text-light"
                        )}>
                          <Banknote size={24} />
                        </div>
                        <div className="text-center">
                          <p className="font-black text-[11px] uppercase tracking-widest text-text-main">Flat Rate</p>
                        </div>
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-text-light uppercase tracking-widest mb-2 ml-1">
                      Service Premium Value
                    </label>
                    <div className="relative group">
                      <input 
                        type="number"
                        value={isNaN(pricing.expressSurchargeValue) ? '' : pricing.expressSurchargeValue}
                        onChange={(e) => setPricing({ ...pricing, expressSurchargeValue: Number(e.target.value) })}
                        className="w-full pl-6 pr-12 py-5 bg-gray-50 border border-border rounded-2xl text-2xl font-black italic tracking-tighter focus:ring-4 focus:ring-brand/5 focus:border-brand transition-all"
                      />
                      <span className="absolute right-6 top-1/2 -translate-y-1/2 text-brand font-black italic text-xl">
                        {pricing.expressSurchargeType === 'percentage' ? '%' : pricing.currency}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="card-minimal">
                <div className="flex items-center gap-4 mb-8">
                  <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-brand">
                    <Settings size={24} />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-text-main uppercase tracking-tight italic">Taxation Configuration</h3>
                    <p className="text-[10px] font-black text-text-light uppercase tracking-widest">Regional financial defaults</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-8">
                  <div className="space-y-2">
                    <label className="block text-[10px] font-black text-text-light uppercase tracking-widest ml-1">VAT / Tax Rate (%)</label>
                    <input 
                      type="number"
                      value={isNaN(pricing.vatRate) ? '' : pricing.vatRate}
                      onChange={(e) => setPricing({ ...pricing, vatRate: Number(e.target.value) })}
                      className="w-full px-6 py-5 bg-gray-50 border border-border rounded-2xl font-black italic text-xl"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-[10px] font-black text-text-light uppercase tracking-widest ml-1">Currency Symbol</label>
                    <input 
                      type="text" 
                      value={pricing.currency}
                      onChange={(e) => setPricing({ ...pricing, currency: e.target.value })}
                      className="w-full px-6 py-5 bg-gray-50 border border-border rounded-2xl font-black italic text-xl"
                    />
                  </div>
                </div>
              </div>

              <div className="card-minimal">
                <div className="flex items-center gap-4 mb-8">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                    <Percent size={24} />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-text-main uppercase tracking-tight italic">Substrate Markups</h3>
                    <p className="text-[10px] font-black text-text-light uppercase tracking-widest">Global margin on raw media</p>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="p-6 bg-surface rounded-3xl border border-border/50">
                    <div className="flex items-center justify-between mb-4">
                      <label className="text-[10px] font-black text-text-light uppercase tracking-widest">Global Material Markup (%)</label>
                      <div className="relative w-32">
                        <input 
                          type="number"
                          value={pricing.materialMarkupPercent}
                          onChange={(e) => setPricing({ ...pricing, materialMarkupPercent: Number(e.target.value) })}
                          className="w-full pl-6 pr-10 py-3 bg-white border border-border rounded-xl font-black text-right text-sm focus:ring-0"
                        />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-text-light font-bold text-xs">%</span>
                      </div>
                    </div>
                    <p className="text-[9px] font-bold text-text-muted italic leading-relaxed uppercase tracking-widest opacity-60">
                      Applied to the Cost Price of media substrates when chosen as independent line items in quotes.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-10">
              <div className="card-minimal">
                <div className="flex items-center gap-4 mb-8">
                  <div className="w-12 h-12 rounded-2xl bg-purple-50 flex items-center justify-center text-purple-600">
                    <Layers size={24} />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-text-main uppercase tracking-tight italic">NCR Calculation Engine</h3>
                    <p className="text-[10px] font-black text-text-light uppercase tracking-widest">Automated costing factors</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-text-light uppercase tracking-widest ml-1">Base Rate (A4)</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-text-light font-bold">R</span>
                      <input 
                        type="number"
                        value={isNaN(pricing.ncrBaseRate) ? '' : pricing.ncrBaseRate}
                        onChange={(e) => setPricing({ ...pricing, ncrBaseRate: Number(e.target.value) })}
                        className="w-full pl-10 pr-4 py-4 bg-gray-50 border border-border rounded-2xl font-bold"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-text-light uppercase tracking-widest ml-1">Numbering</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-text-light font-bold">R</span>
                      <input 
                        type="number"
                        value={isNaN(pricing.ncrNumberingFee) ? '' : pricing.ncrNumberingFee}
                        onChange={(e) => setPricing({ ...pricing, ncrNumberingFee: Number(e.target.value) })}
                        className="w-full pl-10 pr-4 py-4 bg-gray-50 border border-border rounded-2xl font-bold"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-text-light uppercase tracking-widest ml-1">Cover/Binding</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-text-light font-bold">R</span>
                      <input 
                        type="number"
                        value={isNaN(pricing.ncrCoverFee) ? '' : pricing.ncrCoverFee}
                        onChange={(e) => setPricing({ ...pricing, ncrCoverFee: Number(e.target.value) })}
                        className="w-full pl-10 pr-4 py-4 bg-gray-50 border border-border rounded-2xl font-bold"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-6 pt-10 border-t border-border/50">
                  <div className="grid grid-cols-2 gap-10">
                    <div className="space-y-4">
                      <h4 className="text-[10px] font-black text-text-light uppercase tracking-widest px-2">Size Multiplication Factors</h4>
                      {Object.entries(pricing.ncrSizeFactors || {}).map(([size, factor]) => (
                        <div key={size} className="flex items-center justify-between p-4 bg-surface rounded-2xl border border-border group hover:border-brand/30 transition-all">
                          <span className="font-black text-[11px] text-text-main uppercase italic">{size}</span>
                          <input 
                            type="number"
                            step="0.05"
                            value={isNaN(factor as number) ? '' : factor}
                            onChange={(e) => setPricing({
                              ...pricing,
                              ncrSizeFactors: { ...pricing.ncrSizeFactors, [size]: Number(e.target.value) }
                            })}
                            className="w-20 px-3 py-2 bg-white border border-border rounded-xl text-right font-black italic text-xs focus:ring-0"
                          />
                        </div>
                      ))}
                    </div>
                    <div className="space-y-4">
                      <h4 className="text-[10px] font-black text-text-light uppercase tracking-widest px-2">Part Count Scaling</h4>
                      {Object.entries(pricing.ncrPartFactors || {}).map(([part, factor]) => (
                        <div key={part} className="flex items-center justify-between p-4 bg-surface rounded-2xl border border-border group hover:border-brand/30 transition-all">
                          <span className="font-black text-[11px] text-text-main uppercase italic">{part}</span>
                          <input 
                            type="number"
                            step="0.1"
                            value={isNaN(factor as number) ? '' : factor}
                            onChange={(e) => setPricing({
                              ...pricing,
                              ncrPartFactors: { ...pricing.ncrPartFactors, [part]: Number(e.target.value) }
                            })}
                            className="w-20 px-3 py-2 bg-white border border-border rounded-xl text-right font-black italic text-xs focus:ring-0"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <button 
                  onClick={handleSavePricing}
                  disabled={isSaving}
                  className="w-full mt-12 py-5 bg-brand text-white rounded-3xl font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-brand/20 hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-3"
                >
                  {isSaving ? <Check size={18} className="animate-spin" /> : <Save size={18} />}
                  Commit Pricing Logic
                </button>
              </div>
           </div>
        </div>
      ) : (
        <div className="flex flex-col gap-10 pb-20">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            <div className="card-minimal">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-brand">
                  <Mail size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-text-main uppercase tracking-tight italic">Quote Templates</h3>
                  <p className="text-[10px] font-black text-text-light uppercase tracking-widest">Email & WhatsApp defaults</p>
                </div>
              </div>
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-text-light uppercase tracking-widest ml-1">Email Template</label>
                  <textarea 
                    value={company.quoteEmailTemplate}
                    onChange={(e) => setCompany({ ...company, quoteEmailTemplate: e.target.value })}
                    rows={8}
                    className="w-full px-6 py-4 bg-gray-50 border border-border rounded-2xl font-bold focus:ring-4 focus:ring-brand/5 focus:border-brand transition-all resize-none"
                    placeholder="Enter email template..."
                  />
                  <p className="text-[9px] font-bold text-text-muted italic px-2 uppercase tracking-tighter">Available tags: {"{{clientName}}, {{quoteNumber}}, {{companyName}}, {{itemsSummary}}, {{totalAmount}}, {{approvalUrl}}"}</p>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-text-light uppercase tracking-widest ml-1">WhatsApp Template</label>
                  <textarea 
                    value={company.quoteWhatsappTemplate}
                    onChange={(e) => setCompany({ ...company, quoteWhatsappTemplate: e.target.value })}
                    rows={4}
                    className="w-full px-6 py-4 bg-gray-50 border border-border rounded-2xl font-bold focus:ring-4 focus:ring-brand/5 focus:border-brand transition-all resize-none"
                    placeholder="Enter WhatsApp template..."
                  />
                  <p className="text-[9px] font-bold text-text-muted italic px-2 uppercase tracking-tighter">Available tags: {"{{clientName}}, {{quoteNumber}}, {{companyName}}, {{totalAmount}}, {{approvalUrl}}"}</p>
                </div>
              </div>
            </div>

            <div className="card-minimal">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                  <Phone size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-text-main uppercase tracking-tight italic">Job Update Templates</h3>
                  <p className="text-[10px] font-black text-text-light uppercase tracking-widest">Production notifications</p>
                </div>
              </div>
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-text-light uppercase tracking-widest ml-1">Email Template</label>
                  <textarea 
                    value={company.jobEmailTemplate}
                    onChange={(e) => setCompany({ ...company, jobEmailTemplate: e.target.value })}
                    rows={8}
                    className="w-full px-6 py-4 bg-gray-50 border border-border rounded-2xl font-bold focus:ring-4 focus:ring-brand/5 focus:border-brand transition-all resize-none"
                    placeholder="Enter email template..."
                  />
                  <p className="text-[9px] font-bold text-text-muted italic px-2 uppercase tracking-tighter">Available tags: {"{{clientName}}, {{jobNumber}}, {{companyName}}, {{jobStage}}, {{productName}}, {{dueDate}}, {{trackingUrl}}"}</p>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-text-light uppercase tracking-widest ml-1">WhatsApp Template</label>
                  <textarea 
                    value={company.jobWhatsappTemplate}
                    onChange={(e) => setCompany({ ...company, jobWhatsappTemplate: e.target.value })}
                    rows={4}
                    className="w-full px-6 py-4 bg-gray-50 border border-border rounded-2xl font-bold focus:ring-4 focus:ring-brand/5 focus:border-brand transition-all resize-none"
                    placeholder="Enter WhatsApp template..."
                  />
                  <p className="text-[9px] font-bold text-text-muted italic px-2 uppercase tracking-tighter">Available tags: {"{{clientName}}, {{jobNumber}}, {{companyName}}, {{jobStage}}, {{dueDate}}, {{trackingUrl}}"}</p>
                </div>
              </div>
            </div>
            <div className="card-minimal">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                  <Layers size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-text-main uppercase tracking-tight italic">Artwork Approval</h3>
                  <p className="text-[10px] font-black text-text-light uppercase tracking-widest">Client review notifications</p>
                </div>
              </div>
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-text-light uppercase tracking-widest ml-1">Email Template</label>
                  <textarea 
                    value={company.artworkEmailTemplate}
                    onChange={(e) => setCompany({ ...company, artworkEmailTemplate: e.target.value })}
                    rows={8}
                    className="w-full px-6 py-4 bg-gray-50 border border-border rounded-2xl font-bold focus:ring-4 focus:ring-brand/5 focus:border-brand transition-all resize-none"
                    placeholder="Enter email template..."
                  />
                  <p className="text-[9px] font-bold text-text-muted italic px-2 uppercase tracking-tighter">Available tags: {"{{clientName}}, {{jobNumber}}, {{companyName}}, {{approvalUrl}}"}</p>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-text-light uppercase tracking-widest ml-1">WhatsApp Template</label>
                  <textarea 
                    value={company.artworkWhatsappTemplate}
                    onChange={(e) => setCompany({ ...company, artworkWhatsappTemplate: e.target.value })}
                    rows={4}
                    className="w-full px-6 py-4 bg-gray-50 border border-border rounded-2xl font-bold focus:ring-4 focus:ring-brand/5 focus:border-brand transition-all resize-none"
                    placeholder="Enter WhatsApp template..."
                  />
                  <p className="text-[9px] font-bold text-text-muted italic px-2 uppercase tracking-tighter">Available tags: {"{{clientName}}, {{jobNumber}}, {{companyName}}, {{approvalUrl}}"}</p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex justify-end">
            <button 
              onClick={handleSaveCompany}
              disabled={isSaving}
              className="px-12 py-5 bg-brand text-white rounded-3xl font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-brand/20 hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-3"
            >
              {isSaving ? <Check className="animate-spin" /> : <Save size={18} />}
              Update Messaging Templates
            </button>
          </div>
        </div>
      )}

      {showSuccess && (
        <div className="fixed bottom-10 right-10 bg-emerald-600 text-white px-8 py-5 rounded-3xl shadow-2xl flex items-center gap-4 animate-in slide-in-from-right-10 duration-500 z-50">
          <div className="w-10 h-10 bg-white/20 rounded-2xl flex items-center justify-center">
            <Check size={20} />
          </div>
          <div>
            <p className="font-black uppercase tracking-widest text-[10px]">Cloud Sync Successful</p>
            <p className="text-xs font-bold opacity-80 italic">Global settings have been propagated system-wide.</p>
          </div>
        </div>
      )}
    </div>
  );
}
