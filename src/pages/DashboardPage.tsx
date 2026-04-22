/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, ChangeEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Bike, 
  Car, 
  Plus, 
  Settings, 
  Trash2, 
  LogOut,
  ChevronRight,
  History,
  AlertCircle,
  CheckCircle2,
  Download,
  Info,
  Search,
  X,
  PlusCircle,
  FileText,
  Diamond,
  TrendingUp,
  Share2,
  Package,
  Euro,
  Image as ImageIcon,
  CheckCircle,
  Clock,
  ChevronDown,
  Shield
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { PDFDocument } from 'pdf-lib';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell,
  BarChart,
  Bar
} from 'recharts';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import PDFLiveEditor from '../components/PDFLiveEditor';

// --- Types ---
import { Vehicle, ServiceRecord, DocumentRecord, MaintenanceTask } from '../types';

// --- Utils ---

const generateUUID = () => {
  try {
    return crypto.randomUUID();
  } catch (e) {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  }
};

const getServiceAnchor = (m: number): number => {
  const milesInK = Math.floor(m / 1000) * 1000;
  const rem = m % 1000;
  if (rem <= 200) return milesInK;
  if (rem <= 700) return milesInK + 500;
  return milesInK + 1000;
};

const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
};

const isPdfRaw = (dataUrl: string) => {
  return dataUrl.startsWith('data:application/pdf') || dataUrl.includes('JVBERi0');
};

export default function DashboardPage() {
  const { user, signOut, updateBranding } = useAuth();
  const navigate = useNavigate();
  
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeVehicleId, setActiveVehicleId] = useState<string | null>(null);
  const [currentView, setCurrentView] = useState<'dashboard' | 'details'>('dashboard');
  const [activeTab, setActiveTab] = useState<'service' | 'documents' | 'insights' | 'sales'>('service');
  
  const [isAddingService, setIsAddingService] = useState(false);
  const [isAddingVehicle, setIsAddingVehicle] = useState(false);
  const [insightsFrom, setInsightsFrom] = useState('');
  const [insightsTo, setInsightsTo] = useState('');
  const [isAddingDocument, setIsAddingDocument] = useState(false);
  const [isUpdatingVisibility, setIsUpdatingVisibility] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmVehicleDeleteId, setConfirmVehicleDeleteId] = useState<string | null>(null);
  const [confirmDocDeleteId, setConfirmDocDeleteId] = useState<string | null>(null);

  const trackAdminEvent = async (eventType: string) => {
    try {
      await fetch('/api/admin/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventType })
      });
    } catch {}
  };

  // Vehicle Form State
  const [editingVehicleId, setEditingVehicleId] = useState<string | null>(null);
  const [vName, setVName] = useState('');
  const [vModel, setVModel] = useState('');
  const [vYear, setVYear] = useState('');
  const [vMileage, setVMileage] = useState('');
  const [vType, setVType] = useState<'bike' | 'car'>('car');
  const [vTasks, setVTasks] = useState<MaintenanceTask[]>([]);

  // Service Form State
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null);
  const [formMileage, setFormMileage] = useState<string>('');
  const [formDate, setFormDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [formCost, setFormCost] = useState<string>('');
  const [formCategory, setFormCategory] = useState<string>('Service');
  const [selectedTasks, setSelectedTasks] = useState<string[]>([]);
  const [formNotes, setFormNotes] = useState('');
  const [formAttachments, setFormAttachments] = useState<string[]>([]);
  const [customTask, setCustomTask] = useState('');

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTags, setFilterTags] = useState<string[]>([]);

  // Document Form State
  const [docName, setDocName] = useState('');
  const [docType, setDocType] = useState<string>('tuning');
  const [docPrice, setDocPrice] = useState('');
  const [docDate, setDocDate] = useState(new Date().toISOString().split('T')[0]);
  const [docNotes, setDocNotes] = useState('');
  const [docAttachments, setDocAttachments] = useState<string[]>([]);

  // Export State
  const [exportDateFrom, setExportDateFrom] = useState('');
  const [exportDateTo, setExportDateTo] = useState('');
  const [showExportPreview, setShowExportPreview] = useState(false);
  const [exportBranding, setExportBranding] = useState<{ logo?: string; primaryColor?: string }>({});

  useEffect(() => {
    if (user?.branding) {
      setExportBranding({
        logo: user.branding.logo,
        primaryColor: user.branding.primaryColor || '#3b82f6'
      });
    }
  }, [user]);

  useEffect(() => {
    if (user) fetchVehicles();
  }, [user]);

  const fetchVehicles = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const res = await fetch('/api/vehicles');
      if (res.ok) {
        const data = await res.json();
        setVehicles(data);
      }
    } catch (err) {
      console.error("Fetch vehicles failed", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddVehicle = async () => {
    if (!vName || !vModel || !vMileage) return;
    
    // Check limit for new vehicles for non-pro users
    if (!user?.isPro && !editingVehicleId && vehicles.length >= 2) {
      alert("Limit erreicht: Maximal 2 Fahrzeuge pro Account in der Free Version.");
      return;
    }

    const mileageNum = parseInt(vMileage) || 0;
    
    const vData = {
      name: vName,
      model: vModel,
      year: vYear || 'N/A',
      currentMileage: mileageNum,
      type: vType,
      tasks: vTasks
    };

    try {
      const url = editingVehicleId ? `/api/vehicles/${editingVehicleId}` : '/api/vehicles';
      const method = editingVehicleId ? 'PATCH' : 'POST';
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingVehicleId ? vData : { ...vData, id: generateUUID() })
      });

      if (res.ok) {
        await fetchVehicles();
        setIsAddingVehicle(false);
        resetVForm();
      }
    } catch (err) {
      console.error("Save vehicle failed", err);
    }
  };

  const deleteVehicle = async (id: string) => {
    try {
      const res = await fetch(`/api/vehicles/${id}`, { method: 'DELETE' });
      if (res.ok) {
        await fetchVehicles();
        if (activeVehicleId === id) {
          setActiveVehicleId(null);
          setCurrentView('dashboard');
        }
        setConfirmVehicleDeleteId(null);
      }
    } catch (err) {
      console.error("Delete vehicle failed", err);
    }
  };

  const handleAddService = async () => {
    if (!formMileage || selectedTasks.length === 0 || !activeVehicleId) return;
    const mileageNum = parseInt(formMileage);
    
    const entryData = {
      vehicleId: activeVehicleId,
      date: formDate,
      mileage: mileageNum,
      roundedMileage: getServiceAnchor(mileageNum),
      tasks: selectedTasks,
      notes: formNotes,
      attachments: formAttachments,
      cost: parseFloat(formCost) || 0,
      category: formCategory
    };

    try {
      const url = editingServiceId ? `/api/history/${editingServiceId}` : '/api/history';
      const method = editingServiceId ? 'PATCH' : 'POST';
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingServiceId ? entryData : { ...entryData, id: generateUUID() })
      });

      if (res.ok) {
        // Update vehicle mileage if higher
        const activeV = vehicles.find(v => v.id === activeVehicleId);
        if (activeV && mileageNum > activeV.currentMileage) {
          await fetch(`/api/vehicles/${activeVehicleId}/mileage`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ currentMileage: mileageNum })
          });
        }

        await fetchVehicles();
        setIsAddingService(false);
        resetSForm();
      }
    } catch (err) {
      console.error("Save service log failed", err);
    }
  };

  const deleteEntry = async (id: string) => {
    try {
      const res = await fetch(`/api/history/${id}`, { method: 'DELETE' });
      if (res.ok) {
        await fetchVehicles();
        setConfirmDeleteId(null);
      }
    } catch (err) {
      console.error("Delete history failed", err);
    }
  };

  const updateCurrentMileage = async (m: number) => {
    if (!activeVehicleId) return;
    try {
      const res = await fetch(`/api/vehicles/${activeVehicleId}/mileage`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentMileage: m })
      });
      if (res.ok) await fetchVehicles();
    } catch (err) {
      console.error("Update mileage failed", err);
    }
  };

  const updateVehicleVisibility = async (isPublic: boolean) => {
    if (!activeVehicleId) return;
    setIsUpdatingVisibility(true);
    try {
      const res = await fetch(`/api/vehicles/${activeVehicleId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPublic })
      });
      if (res.ok) {
        await fetchVehicles();
      }
    } catch (err) {
      console.error("Update visibility failed", err);
    } finally {
      setIsUpdatingVisibility(false);
    }
  };

  const resetVForm = () => {
    setVName('');
    setVModel('');
    setVYear('');
    setVMileage('');
    setVType('car');
    setVTasks([{ id: generateUUID(), name: 'Ölwechsel', intervalKm: 10000 }]);
    setEditingVehicleId(null);
  };

  const handleAddDocument = async () => {
    if (!docName || !activeVehicleId) return;
    
    const docData = {
      vehicleId: activeVehicleId,
      type: docType,
      name: docName,
      price: parseFloat(docPrice) || 0,
      date: docDate,
      notes: docNotes,
      attachments: docAttachments,
    };

    try {
      const res = await fetch('/api/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...docData, id: generateUUID() })
      });

      if (res.ok) {
        await fetchVehicles();
        setIsAddingDocument(false);
        resetDocForm();
      }
    } catch (err) {
      console.error("Save document failed", err);
    }
  };

  const deleteDocument = async (id: string) => {
    try {
      const res = await fetch(`/api/documents/${id}`, { method: 'DELETE' });
      if (res.ok) {
        await fetchVehicles();
        setConfirmDocDeleteId(null);
      }
    } catch (err) {
      console.error("Delete document failed", err);
    }
  };

  const resetDocForm = () => {
    setDocName('');
    setDocType('tuning');
    setDocPrice('');
    setDocDate(new Date().toISOString().split('T')[0]);
    setDocNotes('');
    setDocAttachments([]);
  };

  const resetSForm = () => {
    setFormMileage('');
    setFormDate(new Date().toISOString().split('T')[0]);
    setFormCost('');
    setFormCategory('Service');
    setSelectedTasks([]);
    setFormNotes('');
    setFormAttachments([]);
    setEditingServiceId(null);
    setCustomTask('');
  };

  const activeVehicle = vehicles.find(v => v.id === activeVehicleId);

  const getUpcomingServices = (v: Vehicle) => {
    if (!v.tasks || !Array.isArray(v.tasks)) return [];
    return v.tasks
      .map(task => {
        const searchLabel = task.name.toLowerCase().trim();
        const sortedHistory = [...(v.history || [])].sort((a, b) => b.mileage - a.mileage);
        const lastEntry = sortedHistory.find(e => 
          e.tasks.some(t => t.toLowerCase().trim() === searchLabel)
        );
        const anchor = lastEntry ? lastEntry.roundedMileage : 0;
        return {
          label: task.name,
          km: anchor + task.intervalKm
        };
      })
      .sort((a, b) => a.km - b.km);
  };

  const nextServices = activeVehicle ? getUpcomingServices(activeVehicle) : [];

  const handleExportPDF = async (vehicle: Vehicle, config?: { 
    logo?: string; 
    primaryColor?: string; 
    dateFrom?: string; 
    dateTo?: string;
    includeAttachments?: boolean;
    showDocuments?: boolean;
  }) => {
    const mainDoc = new jsPDF();
    const history = (vehicle.history || []).sort((a, b) => b.mileage - a.mileage);
    const primaryColor = config?.primaryColor || user?.branding?.primaryColor || '#2563eb';
    const logoUrl = config?.logo || user?.branding?.logo;
    const dateFromValue = config?.dateFrom || exportDateFrom;
    const dateToValue = config?.dateTo || exportDateTo;
    const includeAttachments = config?.includeAttachments !== undefined ? config.includeAttachments : true;
    const showDocuments = config?.showDocuments !== undefined ? config.showDocuments : true;

    // Filter by date if specified
    const filteredHistory = history.filter(entry => {
      const entryDate = new Date(entry.date);
      if (dateFromValue && entryDate < new Date(dateFromValue)) return false;
      if (dateToValue && entryDate > new Date(dateToValue)) return false;
      return true;
    });

    if (logoUrl) {
      try {
        const format = logoUrl.includes('png') ? 'PNG' : 'JPEG';
        mainDoc.addImage(logoUrl, format, 15, 15, 30, 30);
      } catch (e) {
        console.warn("PDF Logo Error", e);
      }
    }
    mainDoc.setFontSize(26);
    mainDoc.setTextColor(primaryColor);
    mainDoc.setFont('helvetica', 'bold');
    mainDoc.text('SERVICE EXPOSÉ', logoUrl ? 55 : 15, 30);
    
    mainDoc.setFontSize(10);
    mainDoc.setTextColor(100, 116, 139);
    mainDoc.text(`Erstellt am ${new Date().toLocaleDateString()} • SUBBOSS SERVICE`, logoUrl ? 55 : 15, 38);

    mainDoc.setFillColor(248, 250, 252);
    mainDoc.roundedRect(15, 55, 180, 40, 5, 5, 'F');

    mainDoc.setFontSize(18);
    mainDoc.setTextColor(15, 23, 42);
    mainDoc.text(vehicle.name.toUpperCase(), 25, 75);
    
    mainDoc.setFontSize(10);
    mainDoc.setTextColor(100, 116, 139);
    mainDoc.text(`${vehicle.model} • ${vehicle.year}`, 25, 82);

    mainDoc.setFontSize(10);
    mainDoc.setTextColor(100, 116, 139);
    mainDoc.text('LAUFLEISTUNG', 160, 71, { align: 'right' });
    mainDoc.setFontSize(22);
    mainDoc.setTextColor(15, 23, 42);
    mainDoc.text(`${vehicle.currentMileage.toLocaleString()} KM`, 160, 82, { align: 'right' });

    const tableData = filteredHistory.map(entry => [
      formatDate(entry.date),
      entry.mileage.toLocaleString() + ' KM',
      entry.tasks.join(', '),
      `${entry.cost?.toLocaleString() || '0'} €`
    ]);

    autoTable(mainDoc, {
      startY: 110,
      head: [['Datum', 'KM-Stand', 'Arbeiten', 'Kosten']],
      body: tableData,
      theme: 'grid',
      headStyles: { 
        fillColor: primaryColor as any, 
        textColor: 255, 
        fontSize: 9, 
        fontStyle: 'bold',
        cellPadding: 5
      },
      bodyStyles: { 
        fontSize: 8,
        cellPadding: 4,
        textColor: 51
      },
      alternateRowStyles: {
        fillColor: 250
      },
      margin: { top: 110, bottom: 25 }
    });

    // Add Analysis Page if Pro
    if (user?.isPro) {
      const totalHistoryCost = filteredHistory.reduce((acc, h) => acc + (h.cost || 0), 0);
      const totalDocCost = showDocuments ? (vehicle.documents || []).reduce((acc, d) => acc + (d.price || 0), 0) : 0;
      
      mainDoc.addPage();
      mainDoc.setFontSize(22);
      mainDoc.setTextColor(primaryColor);
      mainDoc.text('ANALYSE & STATISTIK', 15, 30);
      
      mainDoc.setDrawColor(primaryColor);
      mainDoc.setLineWidth(0.5);
      mainDoc.line(15, 35, 60, 35);

      mainDoc.setFontSize(12);
      mainDoc.setTextColor(51);
      mainDoc.text('WIRTSCHAFTLICHE ÜBERSICHT', 15, 50);

      const summaryBody = [
        ['Gesamtinvestition (Service)', `${totalHistoryCost.toLocaleString()} EUR`],
      ];

      if (showDocuments) {
        summaryBody.push(['Investition Anbauteile', `${totalDocCost.toLocaleString()} EUR`]);
        summaryBody.push(['Gesamtsumme', `${(totalHistoryCost + totalDocCost).toLocaleString()} EUR`]);
      } else {
        summaryBody.push(['Gesamtsumme', `${totalHistoryCost.toLocaleString()} EUR`]);
      }

      summaryBody.push(['Anzahl Service-Einträge', `${filteredHistory.length}`]);
      if (showDocuments) {
        summaryBody.push(['Anzahl Belege/Dokumente', `${(vehicle.documents || []).length}`]);
      }

      autoTable(mainDoc, {
        startY: 55,
        body: summaryBody,
        theme: 'plain',
        styles: { fontSize: 10, cellPadding: 3 },
        columnStyles: { 0: { fontStyle: 'bold', cellWidth: 60 } }
      });

      const categories = filteredHistory.reduce((acc: any, h) => {
        const cat = h.category || 'Service';
        acc[cat] = (acc[cat] || 0) + (h.cost || 0);
        return acc;
      }, {});

      if (Object.keys(categories).length > 0) {
        mainDoc.text('AUSGABEN NACH KATEGORIEN', 15, (mainDoc as any).lastAutoTable.finalY + 15);
        autoTable(mainDoc, {
          startY: (mainDoc as any).lastAutoTable.finalY + 20,
          head: [['Kategorie', 'Betrag']],
          body: Object.entries(categories).map(([k, v]) => [k, `${(v as number).toLocaleString()} EUR`]),
          headStyles: { fillColor: primaryColor },
          margin: { left: 15 }
        });
      }
    }

    // Add Documents Page if Pro
    if (user?.isPro && showDocuments && vehicle.documents && vehicle.documents.length > 0) {
      mainDoc.addPage();
      mainDoc.setFontSize(18);
      mainDoc.setTextColor(primaryColor);
      mainDoc.text('Anbauteile & Dokumente', 14, 25);

      const docData = vehicle.documents.map(d => [
        formatDate(d.date),
        d.name,
        d.type.toUpperCase(),
        `${d.price?.toLocaleString() || '0'} EUR`
      ]);

      autoTable(mainDoc, {
        startY: 35,
        head: [['Datum', 'Bezeichnung', 'Typ', 'Kosten']],
        body: docData,
        headStyles: { fillColor: primaryColor },
      });
    }

    try {
      const mainPdfBytes = mainDoc.output('arraybuffer');
      const finalPdf = await PDFDocument.create();
      const sourceMainPdf = await PDFDocument.load(mainPdfBytes);
      const copiedMainPages = await finalPdf.copyPages(sourceMainPdf, sourceMainPdf.getPageIndices());
      copiedMainPages.forEach((page) => finalPdf.addPage(page));

      // Append Attachments from Service History
      if (includeAttachments) {
        for (const entry of filteredHistory) {
          if (entry.attachments && entry.attachments.length > 0) {
            for (const dataUrl of entry.attachments) {
              try {
                const response = await fetch(dataUrl);
                const fileBytes = await response.arrayBuffer();
                if (isPdfRaw(dataUrl)) {
                  const attachedPdf = await PDFDocument.load(fileBytes, { ignoreEncryption: true });
                  const attachedPages = await finalPdf.copyPages(attachedPdf, attachedPdf.getPageIndices());
                  attachedPages.forEach((page) => finalPdf.addPage(page));
                } else {
                  let image;
                  try { image = await finalPdf.embedJpg(fileBytes); } catch { image = await finalPdf.embedPng(fileBytes); }
                  const page = finalPdf.addPage();
                  const dims = image.scaleToFit(500, 700);
                  page.drawImage(image, { x: 50, y: 50, width: dims.width, height: dims.height });
                }
              } catch (err) {}
            }
          }
        }
      }

      // Append Attachments from Documents (Pro Feature)
      if (user?.isPro && includeAttachments && showDocuments && vehicle.documents) {
        for (const doc of vehicle.documents) {
          if (doc.attachments && doc.attachments.length > 0) {
            for (const dataUrl of doc.attachments) {
              try {
                const response = await fetch(dataUrl);
                const fileBytes = await response.arrayBuffer();
                if (isPdfRaw(dataUrl)) {
                  const attachedPdf = await PDFDocument.load(fileBytes, { ignoreEncryption: true });
                  const attachedPages = await finalPdf.copyPages(attachedPdf, attachedPdf.getPageIndices());
                  attachedPages.forEach((page) => finalPdf.addPage(page));
                } else {
                  let image;
                  try { image = await finalPdf.embedJpg(fileBytes); } catch { image = await finalPdf.embedPng(fileBytes); }
                  const page = finalPdf.addPage();
                  const dims = image.scaleToFit(500, 700);
                  page.drawImage(image, { x: 50, y: 50, width: dims.width, height: dims.height });
                }
              } catch (err) {}
            }
          }
        }
      }

      const finalPdfBytes = await finalPdf.save();
      const blob = new Blob([finalPdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Expose_${vehicle.name.replace(/\s+/g, '_')}.pdf`;
      link.click();
    } catch (e) {
      mainDoc.save(`Expose_${vehicle.name}.pdf`);
    }
  };

  const handleSaveBranding = async (branding: { logo?: string; primaryColor?: string }) => {
    if (!user?.isPro) return;
    try {
      await updateBranding(branding);
    } catch (err) {
      console.error("Branding save failed", err);
    }
  };
  const startEditVehicle = (v: Vehicle) => {
    setEditingVehicleId(v.id);
    setVName(v.name);
    setVModel(v.model);
    setVYear(v.year);
    setVMileage(v.currentMileage.toString());
    setVType(v.type as any);
    setVTasks(Array.isArray(v.tasks) ? v.tasks.map(t => ({ ...t, id: t.id || generateUUID() })) : [{ id: generateUUID(), name: 'Ölwechsel', intervalKm: 10000 }]);
    setIsAddingVehicle(true);
  };

  const startEditService = (entry: ServiceRecord) => {
    setEditingServiceId(entry.id);
    setFormMileage(entry.mileage.toString());
    setFormDate(entry.date);
    setSelectedTasks([...entry.tasks]);
    setFormNotes(entry.notes || '');
    setFormAttachments([...(entry.attachments || [])]);
    setIsAddingService(true);
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    
    // Enforce 1 attachment limit
    if (files.length + formAttachments.length > 1) {
      alert("Limit erreicht: Nur ein Beleg pro Service erlaubt.");
      return;
    }

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.size > 1 * 1024 * 1024) { alert(`Datei ${file.name} ist zu groß (max 1MB)`); continue; }
      const reader = new FileReader();
      reader.onloadend = () => setFormAttachments(prev => [...prev, reader.result as string]);
      reader.readAsDataURL(file);
    }
  };

  // Task/Interval Management
  const addTask = () => {
    setVTasks([...vTasks, { id: generateUUID(), name: '', intervalKm: 10000 }]);
  };

  const removeTask = (id: string) => {
    if (vTasks.length <= 1) return;
    setVTasks(vTasks.filter(t => t.id !== id));
  };

  const updateTask = (id: string, field: keyof MaintenanceTask, value: any) => {
    setVTasks(vTasks.map(t => t.id === id ? { ...t, [field]: value } : t));
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0B0D0F] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Service Desk lädt...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0B0D0F] text-slate-200 font-sans selection:bg-blue-500/30">
      <nav className="fixed top-0 left-0 right-0 h-16 bg-[#0B0D0F]/80 backdrop-blur-md border-b border-white/5 z-40 px-6 flex items-center justify-between">
        <div className="flex flex-col cursor-pointer" onClick={() => { setCurrentView('dashboard'); setActiveVehicleId(null); }}>
          <h1 className="text-xl font-bold tracking-tighter text-white leading-none">
            SUBBOSS <span className="text-blue-500 font-black">SERVICE</span>
          </h1>
          {user && (
            <div className="flex items-center gap-1.5 mt-1 opacity-40">
              <div className="w-1 h-1 rounded-full bg-green-500 animate-pulse"></div>
              <p className="text-[8px] text-white uppercase tracking-[0.2em] font-medium">{user.email}</p>
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-4">
          {currentView === 'details' && (
            <button 
              onClick={() => { setCurrentView('dashboard'); setActiveVehicleId(null); }}
              className="text-[10px] font-bold uppercase tracking-widest text-slate-500 hover:text-white transition-colors"
            >
              Garage
            </button>
          )}
          {user?.role === 'admin' && (
            <Link to="/admin" className="text-[10px] font-bold uppercase tracking-widest text-blue-500/60 hover:text-blue-500 transition-colors">
              Admin
            </Link>
          )}
          <Link to="/settings" className="p-2 text-slate-500 hover:text-white transition-colors">
            <Settings size={18} />
          </Link>
          <button onClick={signOut} className="p-2 text-slate-500 hover:text-red-500 transition-colors">
            <LogOut size={18} />
          </button>
        </div>
      </nav>

      <main className="pt-24 pb-40 px-6 max-w-4xl mx-auto">
        <AnimatePresence mode="wait">
          {currentView === 'dashboard' ? (
            <motion.div key="dashboard" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-12">
              <div className="flex justify-between items-end">
                <div className="flex flex-col gap-1">
                  <h2 className="text-5xl font-black text-white uppercase tracking-tighter leading-none italic">Garage</h2>
                  <p className="text-[10px] text-slate-500 uppercase tracking-[0.3em] font-bold ml-1">Fleet Management ({vehicles.length}{user?.isPro ? '' : '/2'})</p>
                </div>
                <button 
                  onClick={() => { 
                    if (vehicles.length >= 2 && !user?.isPro) {
                      alert("Limit erreicht: Maximal 2 Fahrzeuge im Free-Mode. Schalte PRO in den Einstellungen frei!");
                      navigate('/settings');
                      return;
                    }
                    resetVForm(); 
                    setIsAddingVehicle(true); 
                  }}
                  disabled={vehicles.length >= 2 && !user?.isPro}
                  className={`px-6 py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-xl transition-all flex items-center gap-2 ${vehicles.length >= 2 && !user?.isPro ? 'bg-white/5 text-slate-700 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-600/10'}`}
                >
                  <Plus size={16} strokeWidth={3} /> {vehicles.length >= 2 && !user?.isPro ? 'Limit' : 'Neu'}
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {vehicles.map(v => (
                  <div 
                    key={v.id} 
                    className="group bg-[#111318] border border-white/5 rounded-[2.5rem] p-10 hover:border-blue-500/50 transition-all cursor-pointer relative overflow-hidden active:scale-[0.98]"
                    onClick={() => { setActiveVehicleId(v.id); setCurrentView('details'); }}
                  >
                    <div className="absolute top-0 right-0 p-12 opacity-[0.02] group-hover:opacity-[0.05] transition-opacity grayscale group-hover:grayscale-0">
                      {v.type === 'bike' ? <Bike size={160} /> : <Car size={160} />}
                    </div>
                    <div className="relative z-10">
                      <div className="flex justify-between items-start mb-6">
                        <div className="w-14 h-14 bg-blue-500/10 border border-blue-500/20 rounded-2xl flex items-center justify-center text-blue-500">
                          {v.type === 'bike' ? <Bike size={24} strokeWidth={2.5} /> : <Car size={24} strokeWidth={2.5} />}
                        </div>
                        <div className="flex gap-2">
                          <button onClick={(e) => { e.stopPropagation(); startEditVehicle(v); }} className="p-3 bg-white/5 rounded-xl text-slate-600 hover:text-white hover:bg-white/10 transition-all"><Settings size={14}/></button>
                          <button onClick={(e) => { e.stopPropagation(); setConfirmVehicleDeleteId(v.id); }} className="p-3 bg-white/5 rounded-xl text-slate-600 hover:text-red-500 hover:bg-white/10 transition-all"><Trash2 size={14}/></button>
                        </div>
                      </div>
                      <h3 className="text-4xl font-black text-white tracking-tighter mb-1 uppercase italic leading-none">{v.name}</h3>
                      <p className="text-xs text-slate-600 uppercase tracking-[0.2em] font-bold mb-14">{v.model} <span className="opacity-20 mx-2">|</span> {v.year || 'N/A'}</p>
                      
                      <div className="flex justify-between items-end border-t border-white/[0.03] pt-10">
                        <div>
                          <p className="text-[10px] font-bold text-slate-700 uppercase tracking-widest mb-1">Stand</p>
                          <div className="flex items-baseline gap-2">
                            <span className="text-3xl font-mono font-black text-white tracking-tighter">{v.currentMileage.toLocaleString()}</span>
                            <span className="text-xs font-bold text-slate-700 uppercase">km</span>
                          </div>
                        </div>
                        <div className="bg-blue-600 p-2.5 rounded-xl text-white shadow-lg shadow-blue-900/40">
                          <ChevronRight size={18} strokeWidth={3} />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          ) : (
            <motion.div key="details" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              {activeVehicle && (
                <div className="space-y-8">
                  <div className="flex justify-between items-end mb-4">
                    <div>
                      <h2 className="text-3xl font-bold text-white uppercase tracking-tighter mb-2">{activeVehicle.name}</h2>
                      <p className="text-xs font-mono tracking-widest uppercase text-blue-500">{activeVehicle.model} • {activeVehicle.year}</p>
                    </div>
                    <div className="flex gap-3">
                      {activeTab === 'service' && !activeVehicle.isPublic && (
                        <button 
                          onClick={() => { resetSForm(); setIsAddingService(true); }}
                          className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest shadow-lg shadow-blue-900/40 transition-all flex items-center gap-2"
                        >
                          <Plus size={14} /> Service
                        </button>
                      )}
                      {activeTab === 'documents' && !activeVehicle.isPublic && (
                        <button 
                          onClick={() => { resetDocForm(); setIsAddingDocument(true); }}
                          className="bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest shadow-lg shadow-emerald-900/40 transition-all flex items-center gap-2"
                        >
                          <Plus size={14} /> Dokument
                        </button>
                      )}
                      {!!activeVehicle.isPublic && (
                        <div className="bg-purple-600/20 text-purple-400 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border border-purple-500/30 flex items-center gap-2">
                          <Shield size={12} /> Verkaufsmodus AKTIV
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Tabs Navigation */}
                  <div className="flex items-center gap-1 bg-white/5 p-1 rounded-2xl border border-white/5">
                    <button 
                      onClick={() => setActiveTab('service')}
                      className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'service' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-slate-500 hover:text-white'}`}
                    >
                      <History size={14} /> Service
                    </button>
                    <button 
                      onClick={() => {
                        if (user?.isPro) setActiveTab('documents');
                        else alert('Dieses Feature ist nur für PRO-Nutzer verfügbar.');
                      }}
                      className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'documents' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20' : 'text-slate-500 hover:text-white relative overflow-hidden'}`}
                    >
                      <Package size={14} /> Dokumente
                      {!user?.isPro && <Diamond size={10} className="absolute top-1.5 right-1.5 text-blue-500 opacity-50" />}
                    </button>
                    <button 
                      onClick={() => {
                        if (user?.isPro) setActiveTab('insights');
                        else alert('Dieses Feature ist nur für PRO-Nutzer verfügbar.');
                      }}
                      className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'insights' ? 'bg-amber-600 text-white shadow-lg shadow-amber-600/20' : 'text-slate-500 hover:text-white relative overflow-hidden'}`}
                    >
                      <TrendingUp size={14} /> Insights
                      {!user?.isPro && <Diamond size={10} className="absolute top-1.5 right-1.5 text-blue-500 opacity-50" />}
                    </button>
                    <button 
                      onClick={() => {
                        if (user?.isPro) setActiveTab('sales');
                        else alert('Dieses Feature ist nur für PRO-Nutzer verfügbar.');
                      }}
                      className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'sales' ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/20' : 'text-slate-500 hover:text-white relative overflow-hidden'}`}
                    >
                      <Share2 size={14} /> Verkauf
                      {!user?.isPro && <Diamond size={10} className="absolute top-1.5 right-1.5 text-blue-500 opacity-50" />}
                    </button>
                  </div>

                  {/* PDF Live Editor Integration */}
          {/* Floating Action Button (FAB) for adding entries - only if not in public mode */}
          {!activeVehicle.isPublic && (
            <div className="fixed bottom-32 right-10 z-40">
               <button 
                 onClick={() => {
                   if (activeTab === 'service') { resetSForm(); setIsAddingService(true); }
                   else if (activeTab === 'documents') { resetDocForm(); setIsAddingDocument(true); }
                   else { resetSForm(); setIsAddingService(true); setActiveTab('service'); }
                 }}
                 className="w-16 h-16 bg-blue-600 hover:bg-blue-500 text-white rounded-full flex items-center justify-center shadow-2xl shadow-blue-600/30 transition-all hover:scale-110 active:scale-95 group relative ring-4 ring-[#0B0D0F]"
               >
                 <Plus size={24} strokeWidth={3} className="group-hover:rotate-90 transition-transform duration-300" />
                 <span className="absolute right-full mr-4 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-white/10 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap shadow-xl">
                   {activeTab === 'service' ? 'Service Loggen' : activeTab === 'documents' ? 'Dokument Hinzufügen' : 'Neuer Eintrag'}
                 </span>
               </button>
            </div>
          )}

          <AnimatePresence>
            {showExportPreview && activeVehicle && (
              <PDFLiveEditor 
                vehicle={activeVehicle}
                branding={exportBranding}
                onClose={() => setShowExportPreview(false)}
                onBrandingChange={(b) => setExportBranding(b)}
                onExport={(config) => {
                  handleExportPDF(activeVehicle, config);
                  handleSaveBranding({ logo: config.logo, primaryColor: config.primaryColor });
                  setShowExportPreview(false);
                }}
              />
            )}
          </AnimatePresence>

          <AnimatePresence mode="wait">
                    {activeTab === 'service' && (
                      <motion.div key="service" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-8">
                        <div className="bg-[#111318] border border-white/5 rounded-[2.5rem] p-12 relative overflow-hidden group shadow-2xl">
                          <div className="flex justify-between items-end relative z-10">
                            <div>
                              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-600 block mb-6 px-1">Global Odometer</p>
                              <div className="flex items-baseline gap-6">
                                <span className="text-8xl font-mono tracking-tighter text-white tabular-nums leading-none font-black drop-shadow-2xl">
                                  {activeVehicle.currentMileage.toLocaleString()}
                                </span>
                                <span className="text-xl font-black text-slate-600 uppercase tracking-[0.2em]">km</span>
                              </div>
                            </div>
                            <div className="bg-white/5 rounded-3xl border border-white/5 p-8 text-right hidden lg:block backdrop-blur-sm">
                              <p className="block text-[10px] font-bold text-slate-600 uppercase tracking-[0.2em] mb-3 leading-none">Last Service</p>
                              <p className="text-3xl font-mono font-black text-white tracking-tighter leading-none">
                                {activeVehicle.history[0] ? activeVehicle.history[0].mileage.toLocaleString() : '---'}
                                <span className="text-sm text-slate-600 ml-2 font-black uppercase">KM</span>
                              </p>
                            </div>
                          </div>
                          <div className="mt-12 flex items-center gap-4">
                             <input 
                              type="number"
                              placeholder="Aktualisieren..."
                              className="w-full max-w-[240px] bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-sm font-mono text-white placeholder:text-slate-700 outline-none focus:border-blue-500/50 transition-all shadow-inner uppercase tracking-widest"
                              onBlur={(e) => { const val = parseInt(e.target.value); if (!isNaN(val)) updateCurrentMileage(val); e.target.value = ''; }}
                              onKeyDown={(e) => { if (e.key === 'Enter') { const val = parseInt((e.target as HTMLInputElement).value); if (!isNaN(val)) updateCurrentMileage(val); (e.target as HTMLInputElement).value = ''; } }}
                            />
                            <p className="text-[9px] text-slate-700 uppercase tracking-widest font-bold max-w-[140px] leading-relaxed">Letzten Stand eingeben & Bestätigen</p>
                          </div>
                          <div className="absolute top-0 right-0 p-20 opacity-[0.02] transform -translate-y-10 translate-x-10">
                            {activeVehicle.type === 'bike' ? <Bike size={240} /> : <Car size={240} />}
                          </div>
                        </div>

                        {/* Upcoming Services List */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {getUpcomingServices(activeVehicle).map((service, i) => {
                            const diff = service.km - activeVehicle.currentMileage;
                            const isOverdue = diff <= 200;
                            return (
                              <div key={i} className={`p-6 rounded-2xl border ${isOverdue ? 'bg-red-500/5 border-red-500/20' : 'bg-[#14171C] border-white/5'}`}>
                                <div className="flex justify-between items-start mb-2">
                                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-600">{service.label}</span>
                                  <span className={`text-[10px] font-mono font-bold ${isOverdue ? 'text-red-500' : 'text-slate-400'}`}>
                                    {diff <= 0 ? 'FÄLLIG' : `IN ${diff.toLocaleString()} KM`}
                                  </span>
                                </div>
                                <div className="text-lg font-mono font-bold text-white">{service.km.toLocaleString()} <span className="text-xs text-slate-600">KM</span></div>
                              </div>
                            );
                          })}
                        </div>

                        {/* History List Header with Search & Filter */}
                        <div className="space-y-6 pt-10">
                          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-600 flex items-center gap-2">
                               <History size={14} /> Service-Historie
                            </h3>
                            
                            <div className="flex items-center gap-3">
                               <div className="relative">
                                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" />
                                  <input 
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Suche..."
                                    className="bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder:text-slate-700 focus:border-blue-500/50 outline-none transition-all w-full md:w-64"
                                  />
                               </div>
                            </div>
                          </div>

                          {activeVehicle.history.length === 0 ? (
                            <div className="py-20 text-center border-2 border-dashed border-white/5 rounded-3xl">
                              <p className="text-xs text-slate-700 uppercase tracking-widest">Noch keine Einträge vorhanden</p>
                            </div>
                          ) : (
                            activeVehicle.history
                              .filter(entry => {
                                const matchesSearch = !searchQuery || 
                                  entry.tasks.some(t => t.toLowerCase().includes(searchQuery.toLowerCase())) ||
                                  entry.date.includes(searchQuery) ||
                                  entry.mileage.toString().includes(searchQuery) ||
                                  (entry.notes || '').toLowerCase().includes(searchQuery.toLowerCase());
                                return matchesSearch;
                              })
                              .map(entry => (
                              <div key={entry.id} className="bg-[#14171C] border border-white/5 rounded-2xl p-6 hover:bg-[#181B21] transition-all group">
                                <div className="flex justify-between items-start mb-4">
                                  <div className="flex items-center gap-3">
                                    <div className="bg-green-500/10 text-green-500 p-2 rounded-xl">
                                      <CheckCircle2 size={16} />
                                    </div>
                                    <div>
                                      <span className="text-[10px] text-slate-600 block leading-none mb-1 uppercase tracking-widest font-mono">{formatDate(entry.date)}</span>
                                      <div className="flex items-center gap-3">
                                        <span className="text-lg font-mono font-bold text-white uppercase italic">{entry.mileage.toLocaleString()} KM</span>
                                        <span className="bg-white/5 text-slate-500 text-[10px] px-2 py-0.5 rounded font-black uppercase tracking-widest border border-white/10 flex items-center gap-1">
                                          <Euro size={10} /> {entry.cost?.toLocaleString() || '0'}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => startEditService(entry)} className="p-2 text-slate-700 hover:text-blue-500 transition-colors"><Settings size={14}/></button>
                                    <button onClick={() => setConfirmDeleteId(entry.id)} className="p-2 text-slate-700 hover:text-red-500 transition-colors"><Trash2 size={14}/></button>
                                  </div>
                                </div>
                                <div className="flex flex-wrap gap-2 mb-4">
                                  {entry.tasks.map((t, idx) => (
                                    <span key={idx} className="bg-blue-500/10 text-blue-400 text-[9px] font-bold px-2.5 py-1 rounded-lg uppercase tracking-widest">{t}</span>
                                  ))}
                                </div>
                                
                                {entry.attachments && entry.attachments.length > 0 && (
                                  <div className="flex flex-wrap gap-2 mb-4 pt-2">
                                    {entry.attachments.map((file, idx) => (
                                      <a 
                                        key={idx} 
                                        href={file} 
                                        download={`Beleg_${entry.date}_${idx}.${isPdfRaw(file) ? 'pdf' : 'jpg'}`}
                                        className="flex items-center gap-2 px-4 py-2.5 bg-white/5 border border-white/10 rounded-2xl text-[11px] font-black text-slate-300 hover:text-white hover:bg-white/10 transition-all uppercase tracking-[0.15em] group/file shadow-lg"
                                      >
                                        <FileText size={16} className="text-blue-500" />
                                        {isPdfRaw(file) ? 'PDF RECHNUNG' : `BELEG ${entry.attachments.length > 1 ? (idx + 1) : ''}`}
                                        <Download size={12} className="ml-2 opacity-50" />
                                      </a>
                                    ))}
                                  </div>
                                )}

                                {entry.notes && <p className="text-xs text-slate-500 italic font-sans border-l-2 border-white/10 pl-4 py-1">{entry.notes}</p>}
                              </div>
                            ))
                          )}
                        </div>
                      </motion.div>
                    )}

                    {activeTab === 'documents' && (
                      <motion.div key="documents" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {(activeVehicle.documents || []).map(doc => (
                            <div key={doc.id} className="bg-[#14171C] border border-white/5 rounded-3xl p-6 space-y-4 hover:border-emerald-500/30 transition-all group">
                               <div className="flex justify-between items-start">
                                 <div className="flex items-center gap-3">
                                   <div className="p-3 bg-emerald-500/10 text-emerald-500 rounded-2xl">
                                      <Package size={20} />
                                   </div>
                                   <div>
                                     <h4 className="text-sm font-black text-white uppercase italic tracking-wider">{doc.name}</h4>
                                     <p className="text-[10px] text-slate-600 uppercase tracking-widest font-bold">
                                       {formatDate(doc.date)} • {doc.type}
                                     </p>
                                   </div>
                                 </div>
                                 <button 
                                   onClick={() => setConfirmDocDeleteId(doc.id)}
                                   className="p-2 text-slate-800 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                                 >
                                   <Trash2 size={14} />
                                 </button>
                               </div>

                               <div className="flex justify-between items-end border-t border-white/5 pt-4">
                                 <div>
                                   <p className="text-[10px] font-bold text-slate-700 uppercase tracking-widest mb-1 italic">Kosten</p>
                                   <p className="text-xl font-mono font-black text-white">{doc.price?.toLocaleString() || '0'} €</p>
                                 </div>
                                 {doc.attachments?.length > 0 && (
                                   <a href={doc.attachments[0]} download className="p-2 bg-white/5 rounded-lg text-slate-500 hover:text-white transition-all">
                                      <FileText size={16} />
                                   </a>
                                 )}
                               </div>
                               {doc.notes && <p className="text-[11px] text-slate-600 italic">"{doc.notes}"</p>}
                            </div>
                          ))}
                        </div>
                        {(activeVehicle.documents || []).length === 0 && (
                          <div className="py-20 text-center border-2 border-dashed border-white/5 rounded-3xl">
                            <p className="text-xs text-slate-700 uppercase tracking-widest">Keine Dokumente oder Umbauten erfasst</p>
                          </div>
                        )}
                      </motion.div>
                    )}

                    {activeTab === 'insights' && (
                      <motion.div key="insights" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-8">
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                               <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Zeitraum Von</label>
                               <input type="date" value={insightsFrom} onChange={e => setInsightsFrom(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-xs text-white outline-none focus:border-blue-500/30 transition-all" />
                            </div>
                            <div className="space-y-2">
                               <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Zeitraum Bis</label>
                               <input type="date" value={insightsTo} onChange={e => setInsightsTo(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-xs text-white outline-none focus:border-blue-500/30 transition-all" />
                            </div>
                         </div>

                         <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="bg-[#14171C] border border-white/5 rounded-3xl p-6">
                               <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest mb-4">Gesamtkosten</p>
                               <p className="text-3xl font-mono font-black text-white italic">
                                 {((activeVehicle.history?.filter(h => {
                                   if (insightsFrom && new Date(h.date) < new Date(insightsFrom)) return false;
                                   if (insightsTo && new Date(h.date) > new Date(insightsTo)) return false;
                                   return true;
                                 }).reduce((acc, h) => acc + (h.cost || 0), 0) || 0) + 
                                   (activeVehicle.documents?.filter(d => {
                                     if (insightsFrom && new Date(d.date) < new Date(insightsFrom)) return false;
                                     if (insightsTo && new Date(d.date) > new Date(insightsTo)) return false;
                                     return true;
                                   }).reduce((acc, d) => acc + (d.price || 0), 0) || 0)).toLocaleString()} €
                               </p>
                            </div>
                            <div className="bg-[#14171C] border border-white/5 rounded-3xl p-6">
                               <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest mb-4">KM-Vortrieb</p>
                               <p className="text-3xl font-mono font-black text-white italic">
                                 {((activeVehicle.currentMileage || 0) - (activeVehicle.history?.[activeVehicle.history.length - 1]?.mileage || activeVehicle.currentMileage)).toLocaleString()} KM
                               </p>
                            </div>
                            <div className="bg-[#14171C] border border-white/5 rounded-3xl p-6">
                               <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest mb-4">Einträge</p>
                               <p className="text-3xl font-mono font-black text-white italic">
                                 {(activeVehicle.history?.filter(h => {
                                   if (insightsFrom && new Date(h.date) < new Date(insightsFrom)) return false;
                                   if (insightsTo && new Date(h.date) > new Date(insightsTo)) return false;
                                   return true;
                                 }).length || 0) + (activeVehicle.documents?.filter(d => {
                                   if (insightsFrom && new Date(d.date) < new Date(insightsFrom)) return false;
                                   if (insightsTo && new Date(d.date) > new Date(insightsTo)) return false;
                                   return true;
                                 }).length || 0)}
                               </p>
                            </div>
                         </div>

                         <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            {/* Cost by Category */}
                            <div className="bg-[#14171C] border border-white/5 rounded-[2.5rem] p-8 h-[400px]">
                               <h4 className="text-xs font-black text-white uppercase tracking-widest mb-8 flex items-center gap-2">
                                 <PlusCircle size={14} className="text-emerald-500" /> Kosten pro Kategorie
                               </h4>
                               <ResponsiveContainer width="100%" height="80%">
                                  <PieChart>
                                    <Pie
                                      data={[
                                        ...Object.entries((activeVehicle.history || []).filter(h => {
                                          if (insightsFrom && new Date(h.date) < new Date(insightsFrom)) return false;
                                          if (insightsTo && new Date(h.date) > new Date(insightsTo)) return false;
                                          return true; 
                                        }).reduce((acc: any, h: any) => {
                                          acc[h.category || 'Service'] = (acc[h.category || 'Service'] || 0) + (h.cost || 0);
                                          return acc;
                                        }, {})).map(([name, value]) => ({ name, value })),
                                        ...Object.entries((activeVehicle.documents || []).filter(d => {
                                          if (insightsFrom && new Date(d.date) < new Date(insightsFrom)) return false;
                                          if (insightsTo && new Date(d.date) > new Date(insightsTo)) return false;
                                          return true;
                                        }).reduce((acc: any, d: any) => {
                                          acc[d.type || 'Umbau'] = (acc[d.type || 'Umbau'] || 0) + (d.price || 0);
                                          return acc;
                                        }, {})).map(([name, value]) => ({ name: name.toUpperCase(), value }))
                                      ]}
                                      cx="50%"
                                      cy="50%"
                                      innerRadius={60}
                                      outerRadius={80}
                                      paddingAngle={5}
                                      dataKey="value"
                                    >
                                      {[0,1,2,3,4,5].map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={['#2563eb', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#ec4899'][index % 6]} />
                                      ))}
                                    </Pie>
                                    <Tooltip 
                                      contentStyle={{ backgroundColor: '#0B0D0F', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                                      itemStyle={{ color: '#fff', fontSize: '10px', fontWeight: 'bold' }}
                                    />
                                  </PieChart>
                               </ResponsiveContainer>
                            </div>

                            {/* Mileage development */}
                            <div className="bg-[#14171C] border border-white/5 rounded-[2.5rem] p-8 h-[400px]">
                               <h4 className="text-xs font-black text-white uppercase tracking-widest mb-8 flex items-center gap-2">
                                 <TrendingUp size={14} className="text-blue-500" /> KM-Entwicklung
                               </h4>
                               <ResponsiveContainer width="100%" height="80%">
                                  <LineChart data={[...(activeVehicle.history || [])].filter(h => {
                                    if (insightsFrom && new Date(h.date) < new Date(insightsFrom)) return false;
                                    if (insightsTo && new Date(h.date) > new Date(insightsTo)) return false;
                                    return true;
                                  }).reverse()}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                                    <XAxis dataKey="date" hide />
                                    <YAxis stroke="#475569" fontSize={10} fontVariant="mono" />
                                    <Tooltip 
                                      contentStyle={{ backgroundColor: '#0B0D0F', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                                      labelStyle={{ display: 'none' }}
                                      itemStyle={{ color: '#2563eb', fontSize: '10px', fontWeight: 'bold' }}
                                    />
                                    <Line type="monotone" dataKey="mileage" stroke="#2563eb" strokeWidth={3} dot={{ fill: '#2563eb', r: 4 }} activeDot={{ r: 6 }} />
                                  </LineChart>
                               </ResponsiveContainer>
                            </div>
                         </div>
                      </motion.div>
                    )}

                    {activeTab === 'sales' && !!user?.isPro && (
                      <motion.div key="sales" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-8">
                         <div className="bg-purple-600/10 border border-purple-500/20 rounded-[2.5rem] p-10 space-y-8">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                               <div className="space-y-4">
                                  <div className="flex items-center gap-3">
                                     <div className={`w-3 h-3 rounded-full ${activeVehicle.isPublic ? 'bg-emerald-500 animate-pulse shadow-lg shadow-emerald-500/50' : 'bg-slate-700'}`} />
                                     <h4 className="text-2xl font-black text-white uppercase italic tracking-tighter">
                                       Verkaufsmodus {activeVehicle.isPublic ? 'AKTIV' : 'AUS'}
                                     </h4>
                                  </div>
                                  <p className="text-xs text-slate-500 uppercase tracking-widest font-bold leading-relaxed max-w-sm">
                                    {activeVehicle.isPublic 
                                      ? 'Dein Fahrzeug ist nun öffentlich über den Link erreichbar. Die Bearbeitung im Dashboard ist zum Schutz im Lese-Modus.' 
                                      : 'Aktiviere den Verkaufsmodus, um einen öffentlichen Read-Only Link für Interessenten zu generieren.'}
                                  </p>
                               </div>
                               <button 
                                 onClick={() => updateVehicleVisibility(!activeVehicle.isPublic)}
                                 disabled={isUpdatingVisibility}
                                 className={`px-12 py-5 rounded-[2rem] text-xs font-black uppercase tracking-widest transition-all shadow-2xl flex items-center gap-3 active:scale-95 group disabled:opacity-50 disabled:cursor-not-allowed ${activeVehicle.isPublic ? 'bg-red-600 hover:bg-red-500 text-white shadow-red-500/20' : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-500/20'}`}
                               >
                                 {isUpdatingVisibility ? (
                                   <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                 ) : (
                                   activeVehicle.isPublic ? <X size={20} className="group-hover:rotate-90 transition-transform" /> : <CheckCircle2 size={20} />
                                 )}
                                 {isUpdatingVisibility ? 'Wird aktualisiert...' : (activeVehicle.isPublic ? 'Modus Beenden' : 'Modus Aktivieren')}
                               </button>
                            </div>

                            {!!activeVehicle.isPublic && (
                              <div className="space-y-4">
                                 <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-600 block px-1">Dein öffentlicher Link</label>
                                 <div className="flex gap-2">
                                    <input 
                                      type="text" 
                                      readOnly 
                                      value={`${window.location.origin}/public/${activeVehicle.shareSlug}`}
                                      className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-xs font-mono text-blue-500 outline-none"
                                    />
                                    <button 
                                      onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/public/${activeVehicle.shareSlug}`); alert('Link kopiert!'); }}
                                      className="bg-white/10 hover:bg-white/20 text-white px-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all"
                                    >
                                      Kopieren
                                    </button>
                                 </div>
                              </div>
                            )}
                         </div>

                         <div className="bg-[#14171C] border border-white/5 rounded-[2.5rem] p-10 space-y-8 relative overflow-hidden group">
                           <Download className="absolute top-0 right-0 p-12 opacity-[0.02]" size={200} />
                           <div className="flex flex-col md:flex-row items-center justify-between gap-10 relative z-10">
                             <div className="space-y-4">
                               <h3 className="text-3xl font-black text-white uppercase italic tracking-tighter">Design-Exposé Export</h3>
                               <p className="text-slate-500 text-sm max-w-sm">Erschaffen Sie ein professionelles Serviceheft mit Ihrem Design, Zeitraum-Filter und angebundenen Rechnungen/Gutachten.</p>
                             </div>

                             <button 
                               onClick={() => setShowExportPreview(true)}
                               className="bg-white text-black px-10 py-6 rounded-2xl font-black uppercase tracking-widest text-[11px] shadow-2xl hover:scale-105 active:scale-95 transition-all flex items-center gap-3"
                             >
                               <Download size={18} strokeWidth={3} /> Live Editor Starten
                             </button>
                           </div>

                           <div className="flex gap-3 flex-wrap relative z-10">
                              <span className="bg-white/5 text-slate-600 px-3 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest border border-white/5">Eigene Logos</span>
                              <span className="bg-white/5 text-slate-600 px-3 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest border border-white/5">Farbschema</span>
                              <span className="bg-white/5 text-slate-600 px-3 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest border border-white/5">Zeitraum Filter</span>
                              <span className="bg-white/5 text-slate-600 px-3 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest border border-white/5">Dokumente Inklusive</span>
                           </div>
                         </div>
                      </motion.div>
                    )}

                    {activeTab === 'service' && !user?.isPro && (
                      <div className="pt-10">
                        <button 
                          onClick={() => handleExportPDF(activeVehicle)}
                          className="w-full bg-white/5 hover:bg-white/10 text-slate-500 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border border-white/5 flex items-center justify-center gap-2"
                        >
                          <Download size={14} /> Einfacher Basis-Export (Free)
                        </button>
                      </div>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* --- Modals Overlay --- */}
      <AnimatePresence>
        {(isAddingVehicle || isAddingService || isAddingDocument || confirmDeleteId || confirmVehicleDeleteId || confirmDocDeleteId) && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-[#0B0D0F]/90 backdrop-blur-md z-50 flex items-center justify-center p-6">
             <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-[#14171C] border border-white/10 rounded-3xl w-full max-w-2xl p-8 shadow-2xl relative overflow-hidden">
                <button onClick={() => { setIsAddingVehicle(false); setIsAddingService(false); setIsAddingDocument(false); setConfirmDeleteId(null); setConfirmVehicleDeleteId(null); setConfirmDocDeleteId(null); resetVForm(); resetSForm(); resetDocForm(); }} className="absolute top-6 right-6 text-slate-600 hover:text-white transition-colors"><X size={20}/></button>
                
                {/* Add/Edit Vehicle Modal Content */}
                {isAddingVehicle && (
                  <div className="space-y-6 max-h-[85vh] overflow-y-auto pr-2 custom-scrollbar">
                    <h3 className="text-2xl font-bold text-white uppercase tracking-tighter">{editingVehicleId ? 'Fahrzeug bearbeiten' : 'Neues Fahrzeug'}</h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">Anzeige-Name</label>
                        <input value={vName} onChange={e => setVName(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3.5 text-sm text-white focus:border-blue-500/50 outline-none transition-all" placeholder="z.B. Mein Honda" />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">Modellbezeichnung</label>
                        <input value={vModel} onChange={e => setVModel(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3.5 text-sm text-white focus:border-blue-500/50 outline-none transition-all" placeholder="z.B. CBR 125R" />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">Baujahr</label>
                        <input value={vYear} onChange={e => setVYear(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3.5 text-sm text-white focus:border-blue-500/50 outline-none transition-all" placeholder="2005" />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">Aktueller KM-Stand</label>
                        <input type="number" value={vMileage} onChange={e => setVMileage(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3.5 text-sm text-white font-mono focus:border-blue-500/50 outline-none transition-all" placeholder="0" />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">Typ</label>
                        <div className="flex p-1 bg-white/5 rounded-2xl border border-white/10 h-[52px]">
                          <button onClick={() => setVType('car')} className={`flex-1 flex items-center justify-center gap-2 text-[10px] font-bold uppercase rounded-xl transition-all ${vType === 'car' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}>
                            <Car size={14}/>
                          </button>
                          <button onClick={() => setVType('bike')} className={`flex-1 flex items-center justify-center gap-2 text-[10px] font-bold uppercase rounded-xl transition-all ${vType === 'bike' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}>
                            <Bike size={14}/>
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Service Intervals Section */}
                    <div className="pt-4 border-t border-white/5">
                      <div className="flex justify-between items-center mb-4">
                        <div className="flex flex-col">
                          <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Service-Intervalle</label>
                          <p className="text-[9px] text-slate-600 uppercase tracking-widest">Wann stehen die nächsten Arbeiten an?</p>
                        </div>
                        <button 
                          onClick={addTask}
                          className="flex items-center gap-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-500 px-3 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all"
                        >
                          <PlusCircle size={14} /> Hinzufügen
                        </button>
                      </div>

                            <div className="flex flex-wrap gap-2 mb-3">
                              {vTasks.map((task) => (
                                <div key={task.id} className="flex gap-3 items-end group/task bg-white/[0.02] p-4 rounded-2xl border border-white/5">
                                  <div className="flex-1 space-y-1.5">
                                    <label className="text-[9px] font-bold uppercase tracking-widest text-slate-600 ml-1">Bezeichnung</label>
                                    <input 
                                      value={task.name} 
                                      onChange={e => updateTask(task.id, 'name', e.target.value)}
                                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white" 
                                      placeholder="z.B. Ölwechsel"
                                    />
                                  </div>
                                  <div className="w-[120px] space-y-1.5">
                                    <label className="text-[9px] font-bold uppercase tracking-widest text-slate-600 ml-1">Alle ... KM</label>
                                    <input 
                                      type="number"
                                      value={task.intervalKm} 
                                      onChange={e => updateTask(task.id, 'intervalKm', parseInt(e.target.value) || 0)}
                                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white font-mono" 
                                      placeholder="10000"
                                    />
                                  </div>
                            <button 
                              onClick={() => removeTask(task.id)}
                              disabled={vTasks.length <= 1}
                              className="p-2.5 text-slate-700 hover:text-red-500 transition-colors disabled:opacity-30"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>

                    <button onClick={handleAddVehicle} className="w-full bg-blue-600 hover:bg-blue-500 text-white py-4 rounded-2xl font-bold uppercase tracking-widest transition-all mt-4">
                      {editingVehicleId ? 'Änderungen speichern' : 'Fahrzeug anlegen'}
                    </button>
                  </div>
                )}

                {/* Log Service Modal Content */}
                {isAddingService && (
                   <div className="space-y-6 max-h-[85vh] overflow-y-auto custom-scrollbar pr-2">
                      <h3 className="text-2xl font-bold text-white uppercase tracking-tighter">Service Loggen</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                         <div className="space-y-1.5">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">Datum</label>
                            <input type="date" value={formDate} onChange={e => setFormDate(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3.5 text-sm text-white focus:border-blue-500/50 outline-none" />
                         </div>
                         <div className="space-y-1.5">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">Kilometerstand</label>
                            <input type="number" value={formMileage} onChange={e => setFormMileage(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3.5 text-sm text-white font-mono focus:border-blue-500/50 outline-none" placeholder="0" />
                         </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                         <div className="space-y-1.5">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1 flex items-center gap-2">
                               Kosten (€) <span className="text-red-500">*</span>
                            </label>
                            <div className="relative">
                               <Euro size={12} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-700" />
                               <input type="number" required value={formCost} onChange={e => setFormCost(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-2xl pl-10 pr-4 py-3.5 text-sm text-white font-mono focus:border-red-500/50 outline-none transition-all placeholder:text-slate-800" placeholder="0.00" />
                            </div>
                         </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">Kategorie</label>
                          <select value={formCategory} onChange={e => setFormCategory(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3.5 text-sm text-white focus:border-blue-500/50 outline-none appearance-none">
                            <option value="Service">Service</option>
                            <option value="Reparatur">Reparatur</option>
                            <option value="Tuning">Tuning</option>
                            <option value="Verschleiß">Verschleiß</option>
                            <option value="Pflege">Pflege</option>
                            <option value="Sonstiges">Sonstiges</option>
                          </select>
                        </div>
                      </div>
                      <div className="space-y-2">
                         <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">Arbeiten</label>
                         <div className="grid grid-cols-2 gap-2 mb-3">
                            {activeVehicle?.tasks.map(t => (
                              <button key={t.id} onClick={() => setSelectedTasks(prev => prev.includes(t.name) ? prev.filter(x => x !== t.name) : [...prev, t.name])} className={`text-left p-3.5 rounded-xl border text-[11px] font-bold uppercase transition-all ${selectedTasks.includes(t.name) ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white/5 border-white/5 text-slate-500 hover:border-white/20'}`}>{t.name}</button>
                            ))}
                         </div>
                         
                         {/* One-off custom task input */}
                         <div className="flex gap-2">
                           <input 
                             type="text" 
                             value={customTask}
                             onChange={e => setCustomTask(e.target.value)}
                             placeholder="Eigene Arbeit hinzufügen..."
                             className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:border-blue-500/50 outline-none"
                             onKeyDown={(e) => {
                               if (e.key === 'Enter' && customTask.trim()) {
                                 e.preventDefault();
                                 if (!selectedTasks.includes(customTask.trim())) {
                                   setSelectedTasks([...selectedTasks, customTask.trim()]);
                                 }
                                 setCustomTask('');
                               }
                             }}
                           />
                           <button 
                             onClick={() => {
                               if (customTask.trim()) {
                                 if (!selectedTasks.includes(customTask.trim())) {
                                   setSelectedTasks([...selectedTasks, customTask.trim()]);
                                 }
                                 setCustomTask('');
                               }
                             }}
                             className="bg-blue-600/10 text-blue-500 p-3 rounded-xl hover:bg-blue-600/20 transition-all border border-blue-500/20"
                           >
                             <Plus size={16} />
                           </button>
                         </div>
                         
                         {/* Show custom tasks as chips if they are not in the vehicle's default tasks */}
                         <div className="flex flex-wrap gap-2 mt-3">
                            {selectedTasks.filter(st => !activeVehicle?.tasks.some(t => t.name === st)).map((ct, idx) => (
                              <span key={idx} className="bg-blue-600 text-white text-[9px] font-bold px-2.5 py-1 rounded-lg uppercase tracking-widest flex items-center gap-2">
                                {ct}
                                <button onClick={() => setSelectedTasks(selectedTasks.filter(t => t !== ct))}><X size={10}/></button>
                              </span>
                            ))}
                         </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">Notizen</label>
                        <textarea value={formNotes} onChange={e => setFormNotes(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3.5 text-sm text-white h-24 outline-none focus:border-blue-500/50" placeholder="Zusätzliche Infos..." />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">Anhänge (Max 1, je 1MB)</label>
                        <div className="flex items-center gap-4">
                           <button 
                             onClick={() => document.getElementById('service-file-upload')?.click()}
                             className="bg-blue-600/10 text-blue-500 px-6 py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest border border-blue-500/20 hover:bg-blue-600/20 transition-all flex items-center gap-2"
                           >
                             <ImageIcon size={14} /> Datei auswählen
                           </button>
                           <input 
                             id="service-file-upload"
                             type="file" 
                             accept="image/*,application/pdf" 
                             onChange={handleFileChange} 
                             className="hidden" 
                           />
                           <span className="text-[10px] text-slate-600 font-bold uppercase tracking-widest">
                             {formAttachments.length > 0 ? '1 Datei ausgewählt' : 'Keine Datei'}
                           </span>
                        </div>
                        <div className="flex gap-3 flex-wrap mt-4">
                          {formAttachments.map((att, idx) => (
                            <div key={idx} className="relative group/att w-20 h-20 rounded-2xl bg-white/5 overflow-hidden border border-white/10 transition-all hover:scale-105">
                              {isPdfRaw(att) ? (
                                <div className="w-full h-full flex flex-col items-center justify-center bg-blue-500/10 text-blue-500">
                                  <FileText size={24} />
                                  <span className="text-[8px] font-black mt-1">PDF</span>
                                </div>
                              ) : (
                                <img src={att} className="w-full h-full object-cover" />
                              )}
                              <button onClick={() => setFormAttachments(prev => prev.filter((_, i) => i !== idx))} className="absolute inset-0 bg-red-600/80 items-center justify-center hidden group-hover/att:flex text-white transition-all">
                                <Trash2 size={20}/>
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                      <button onClick={handleAddService} className="w-full bg-blue-600 hover:bg-blue-500 text-white py-4 rounded-2xl font-bold uppercase tracking-widest transition-all">Speichern</button>
                   </div>
                )}

                 {/* Add Document Modal Content */}
                 {isAddingDocument && (
                   <div className="space-y-6 max-h-[85vh] overflow-y-auto custom-scrollbar pr-2">
                     <h3 className="text-2xl font-bold text-white uppercase tracking-tighter italic">Dokument / Umbau</h3>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                       <div className="space-y-1.5">
                         <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">Bezeichnung</label>
                         <input value={docName} onChange={e => setDocName(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3.5 text-sm text-white focus:border-blue-500/50 outline-none" placeholder="z.B. Sportauspuff" />
                       </div>
                       <div className="space-y-1.5">
                         <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">Typ</label>
                         <select value={docType} onChange={e => setDocType(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3.5 text-sm text-white focus:border-blue-500/50 outline-none appearance-none font-bold uppercase">
                           <option value="tuning">Tuning-Teil</option>
                           <option value="gutachten">Gutachten</option>
                           <option value="abe">ABE / Eintragungen</option>
                           <option value="tuev">TÜV Dokument</option>
                         </select>
                       </div>
                     </div>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                       <div className="space-y-1.5">
                         <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">Preis (€)</label>
                         <input type="number" value={docPrice} onChange={e => setDocPrice(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3.5 text-sm text-white font-mono focus:border-blue-500/50 outline-none" placeholder="0.00" />
                       </div>
                       <div className="space-y-1.5">
                         <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">Datum</label>
                         <input type="date" value={docDate} onChange={e => setDocDate(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3.5 text-sm text-white focus:border-blue-500/50 outline-none" />
                       </div>
                     </div>
                     <div className="space-y-2">
                       <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">Dateiupload (PDF/BILD)</label>
                        <div className="flex items-center gap-4">
                           <button 
                             onClick={() => document.getElementById('doc-file-upload')?.click()}
                             className="bg-emerald-600/10 text-emerald-500 px-6 py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest border border-emerald-500/20 hover:bg-emerald-600/20 transition-all flex items-center gap-2"
                           >
                             <ImageIcon size={14} /> Datei auswählen
                           </button>
                           <input 
                              id="doc-file-upload"
                              type="file" 
                              accept="image/*,application/pdf" 
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                   if (file.size > 1 * 1024 * 1024) return alert('Datei zu groß (max 1MB)');
                                   const reader = new FileReader();
                                   reader.onloadend = () => setDocAttachments([reader.result as string]);
                                   reader.readAsDataURL(file);
                                }
                              }} 
                              className="hidden" 
                           />
                           {docAttachments.length > 0 && (
                             <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 overflow-hidden">
                               {isPdfRaw(docAttachments[0]) ? (
                                 <div className="w-full h-full flex items-center justify-center text-emerald-500"><FileText size={16}/></div>
                               ) : (
                                 <img src={docAttachments[0]} className="w-full h-full object-cover" />
                               )}
                             </div>
                           )}
                        </div>
                     </div>
                     <button onClick={handleAddDocument} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-4 rounded-2xl font-bold uppercase tracking-widest transition-all">Dokument Speichern</button>
                   </div>
                 )}

                {/* Confirm Delete Modals */}
                {(confirmDeleteId || confirmVehicleDeleteId || confirmDocDeleteId) && (
                   <div className="text-center py-6">
                      <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6"><AlertCircle size={32}/></div>
                      <h3 className="text-2xl font-bold text-white uppercase tracking-tighter mb-2">Sicher?</h3>
                      <p className="text-slate-400 text-sm mb-10 leading-relaxed">Diese Aktion kann nicht rückgängig gemacht werden. Alle Daten gehen dauerhaft verloren.</p>
                      <div className="flex gap-4">
                        <button onClick={() => { setConfirmDeleteId(null); setConfirmVehicleDeleteId(null); setConfirmDocDeleteId(null); }} className="flex-1 bg-white/5 hover:bg-white/10 text-slate-500 py-4 rounded-2xl font-bold uppercase tracking-widest transition-all">Abbrechen</button>
                        <button onClick={() => {
                          if (confirmDeleteId) deleteEntry(confirmDeleteId);
                          else if (confirmVehicleDeleteId) deleteVehicle(confirmVehicleDeleteId);
                          else if (confirmDocDeleteId) deleteDocument(confirmDocDeleteId);
                        }} className="flex-1 bg-red-600 hover:bg-red-500 text-white py-4 rounded-2xl font-bold uppercase tracking-widest transition-all">Endgültig Löschen</button>
                      </div>
                   </div>
                )}

             </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <footer className="fixed bottom-0 left-0 right-0 py-6 bg-[#0B0D0F]/90 backdrop-blur-sm border-t border-white/5 z-40 text-center">
        <div className="flex justify-center gap-6 mb-2">
           <Link to="/legal" className="text-[10px] font-bold uppercase tracking-widest text-slate-500 hover:text-white transition-colors">Datenschutz</Link>
        </div>
        <p className="text-[9px] text-slate-700 uppercase tracking-widest">&copy; {new Date().getFullYear()} SubBoss Service Desk • {user?.isPro ? 'PRO VERSION' : 'FREE VERSION'}</p>
      </footer>
    </div>
  );
}
