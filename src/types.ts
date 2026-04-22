export interface Vehicle {
  id: string;
  name: string;
  model: string;
  year: string;
  currentMileage: number;
  type: 'Car' | 'Motorcycle';
  tasks: MaintenanceTask[];
  history: ServiceRecord[];
  documents: DocumentRecord[];
  isPublic: boolean;
  shareSlug: string;
}

export interface MaintenanceTask {
  id: string;
  name: string;
  intervalKm: number;
}

export interface ServiceRecord {
  id: string;
  date: string;
  mileage: number;
  roundedMileage: number;
  tasks: string[];
  notes?: string;
  attachments: string[];
  cost: number;
  category: string;
}

export interface DocumentRecord {
  id: string;
  type: 'tuning' | 'gutachten' | 'abe' | 'tuev';
  name: string;
  price: number;
  date: string;
  notes?: string;
  attachments: string[];
}

export interface Branding {
  logo?: string;
  primaryColor?: string;
}
