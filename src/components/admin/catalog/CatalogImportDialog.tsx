import { useState, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Loader2, Upload, FileSpreadsheet, Check, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import * as XLSX from 'xlsx';

interface CatalogImportDialogProps {
  onClose: () => void;
  onComplete: () => void;
}

type ImportType = 'styles' | 'specs' | 'categories';

interface ImportStatus {
  type: ImportType;
  status: 'pending' | 'processing' | 'success' | 'error';
  message?: string;
  count?: number;
}

export function CatalogImportDialog({ onClose, onComplete }: CatalogImportDialogProps) {
  const [imports, setImports] = useState<Record<ImportType, ImportStatus>>({
    styles: { type: 'styles', status: 'pending' },
    specs: { type: 'specs', status: 'pending' },
    categories: { type: 'categories', status: 'pending' }
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  const updateStatus = (type: ImportType, update: Partial<ImportStatus>) => {
    setImports(prev => ({
      ...prev,
      [type]: { ...prev[type], ...update }
    }));
  };

  const parseExcel = (file: File): Promise<any[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
          const jsonData = XLSX.utils.sheet_to_json(firstSheet);
          resolve(jsonData);
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });
  };

  const importData = async (type: ImportType, data: any[]) => {
    updateStatus(type, { status: 'processing' });
    
    try {
      // Send in batches to avoid payload limits
      const batchSize = 1000;
      let totalInserted = 0;

      for (let i = 0; i < data.length; i += batchSize) {
        const batch = data.slice(i, i + batchSize);
        
        const { data: result, error } = await supabase.functions.invoke('import-catalog', {
          body: { type, data: batch }
        });

        if (error) throw error;
        if (result.error) throw new Error(result.error);
        
        totalInserted += result.inserted || 0;
      }

      updateStatus(type, { 
        status: 'success', 
        count: totalInserted,
        message: `Imported ${totalInserted.toLocaleString()} records`
      });
    } catch (error) {
      console.error(`Error importing ${type}:`, error);
      updateStatus(type, { 
        status: 'error', 
        message: error instanceof Error ? error.message : 'Import failed'
      });
    }
  };

  const handleFileSelect = async (type: ImportType, file: File) => {
    try {
      updateStatus(type, { status: 'processing', message: 'Parsing file...' });
      const data = await parseExcel(file);
      
      if (data.length === 0) {
        updateStatus(type, { status: 'error', message: 'No data found in file' });
        return;
      }

      updateStatus(type, { message: `Uploading ${data.length.toLocaleString()} records...` });
      await importData(type, data);
    } catch (error) {
      console.error(`Error parsing ${type}:`, error);
      updateStatus(type, { 
        status: 'error', 
        message: 'Failed to parse Excel file'
      });
    }
  };

  const handleDrop = useCallback((type: ImportType) => (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && (file.name.endsWith('.xlsx') || file.name.endsWith('.xls'))) {
      handleFileSelect(type, file);
    }
  }, []);

  const handleFileInput = (type: ImportType) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(type, file);
    }
  };

  const allDone = Object.values(imports).every(i => i.status === 'success' || i.status === 'error');
  const anySuccess = Object.values(imports).some(i => i.status === 'success');

  const renderUploadZone = (type: ImportType, label: string, description: string) => {
    const status = imports[type];
    
    return (
      <div
        className={`border-2 border-dashed rounded-lg p-4 transition-colors ${
          status.status === 'success' ? 'border-green-500 bg-green-500/10' :
          status.status === 'error' ? 'border-destructive bg-destructive/10' :
          status.status === 'processing' ? 'border-accent bg-accent/10' :
          'border-border hover:border-accent'
        }`}
        onDrop={handleDrop(type)}
        onDragOver={(e) => e.preventDefault()}
      >
        <div className="flex items-center gap-4">
          <div className={`p-3 rounded-full ${
            status.status === 'success' ? 'bg-green-500/20 text-green-600' :
            status.status === 'error' ? 'bg-destructive/20 text-destructive' :
            status.status === 'processing' ? 'bg-accent/20 text-accent' :
            'bg-secondary text-muted-foreground'
          }`}>
            {status.status === 'processing' ? (
              <Loader2 className="w-6 h-6 animate-spin" />
            ) : status.status === 'success' ? (
              <Check className="w-6 h-6" />
            ) : status.status === 'error' ? (
              <AlertCircle className="w-6 h-6" />
            ) : (
              <FileSpreadsheet className="w-6 h-6" />
            )}
          </div>
          
          <div className="flex-1 min-w-0">
            <p className="font-medium">{label}</p>
            <p className="text-sm text-muted-foreground">{description}</p>
            {status.message && (
              <p className={`text-sm mt-1 ${
                status.status === 'success' ? 'text-green-600' :
                status.status === 'error' ? 'text-destructive' :
                'text-accent'
              }`}>
                {status.message}
              </p>
            )}
          </div>

          {status.status === 'pending' && (
            <div>
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileInput(type)}
                className="hidden"
                id={`file-${type}`}
              />
              <Label htmlFor={`file-${type}`} className="cursor-pointer">
                <Button variant="outline" size="sm" asChild>
                  <span>
                    <Upload className="w-4 h-4 mr-2" />
                    Choose File
                  </span>
                </Button>
              </Label>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Import Catalog Data</DialogTitle>
          <DialogDescription>
            Upload Excel files to populate your product catalog. Drag & drop or click to select.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {renderUploadZone('styles', 'Styles.xlsx', 'Main product catalog with images and descriptions')}
          {renderUploadZone('specs', 'Specs.xlsx', 'Detailed specifications linked to styles')}
          {renderUploadZone('categories', 'Categories.xlsx', 'Product categories and groupings')}
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            {anySuccess ? 'Close' : 'Cancel'}
          </Button>
          {anySuccess && (
            <Button onClick={onComplete} className="btn-cta">
              Done
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
