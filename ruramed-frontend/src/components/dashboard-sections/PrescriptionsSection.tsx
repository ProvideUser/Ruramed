'use client';

import { useState } from 'react';
import { FileText, Download, Eye, Search, Filter, Calendar, Pill, Plus, Upload } from 'lucide-react';
import toast from 'react-hot-toast';

interface Prescription {
  id: number;
  prescriptionNumber: string;
  doctorName: string;
  date: string;
  medications: Array<{
    name: string;
    dosage: string;
    frequency: string;
    duration: string;
  }>;
  diagnosis: string;
  notes?: string;
  fileUrl?: string;
  status: 'active' | 'expired' | 'completed';
}

// Mock data
const MOCK_PRESCRIPTIONS: Prescription[] = [
  {
    id: 1,
    prescriptionNumber: 'RX-2025-001',
    doctorName: 'Dr. Rajesh Kumar',
    date: '2025-11-01',
    medications: [
      {
        name: 'Amoxicillin',
        dosage: '500mg',
        frequency: 'Twice daily',
        duration: '7 days',
      },
      {
        name: 'Paracetamol',
        dosage: '650mg',
        frequency: 'As needed',
        duration: '5 days',
      },
    ],
    diagnosis: 'Upper respiratory tract infection',
    notes: 'Complete the full course. Avoid dairy products while taking antibiotics.',
    status: 'active',
  },
  {
    id: 2,
    prescriptionNumber: 'RX-2025-002',
    doctorName: 'Dr. Priya Sharma',
    date: '2025-10-20',
    medications: [
      {
        name: 'Lisinopril',
        dosage: '10mg',
        frequency: 'Once daily',
        duration: 'Ongoing',
      },
      {
        name: 'Atorvastatin',
        dosage: '20mg',
        frequency: 'Once daily at night',
        duration: 'Ongoing',
      },
    ],
    diagnosis: 'Hypertension and High Cholesterol',
    notes: 'Regular checkup required every 3 months. Monitor blood pressure daily.',
    status: 'active',
  },
  {
    id: 3,
    prescriptionNumber: 'RX-2025-003',
    doctorName: 'Dr. Vikram Singh',
    date: '2025-09-15',
    medications: [
      {
        name: 'Ibuprofen',
        dosage: '400mg',
        frequency: 'Twice daily',
        duration: '10 days',
      },
      {
        name: 'Vitamin D3',
        dosage: '1000 IU',
        frequency: 'Once daily',
        duration: 'Ongoing',
      },
    ],
    diagnosis: 'Knee pain and Vitamin D deficiency',
    notes: 'Rest affected knee. Physical therapy recommended.',
    status: 'completed',
  },
];

export function PrescriptionsSection() {
  const [prescriptions, setPrescriptions] = useState<Prescription[]>(MOCK_PRESCRIPTIONS);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [expandedPrescription, setExpandedPrescription] = useState<number | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);

  const filteredPrescriptions = prescriptions.filter((prescription) => {
    const matchesSearch =
      prescription.doctorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      prescription.prescriptionNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      prescription.diagnosis.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || prescription.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
      case 'expired':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
      case 'completed':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
      default:
        return 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-300';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
            Prescriptions
          </h1>
          <p className="mt-2 text-slate-600 dark:text-slate-400">
            View and manage your prescriptions
          </p>
        </div>
        <button
          onClick={() => setShowUploadModal(true)}
          className="btn-primary flex items-center gap-2"
        >
          <Upload className="w-4 h-4" />
          Upload Prescription
        </button>
      </div>

      {/* Search and Filter */}
      <div className="card space-y-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by doctor, prescription number, or diagnosis..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-field pl-10"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-slate-400" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="input-field"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
              <option value="expired">Expired</option>
            </select>
          </div>
        </div>
      </div>

      {/* Prescriptions List */}
      <div className="space-y-4">
        {filteredPrescriptions.length > 0 ? (
          filteredPrescriptions.map((prescription) => (
            <div key={prescription.id} className="card">
              {/* Header */}
              <button
                onClick={() =>
                  setExpandedPrescription(
                    expandedPrescription === prescription.id ? null : prescription.id
                  )
                }
                className="w-full flex items-center justify-between hover:opacity-80 transition-opacity"
              >
                <div className="flex-1 text-left">
                  <div className="flex items-center gap-3 flex-wrap mb-2">
                    <div className="p-2 bg-primary-100 dark:bg-primary-900/30 rounded-lg">
                      <FileText className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900 dark:text-white">
                        {prescription.prescriptionNumber}
                      </p>
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        by {prescription.doctorName}
                      </p>
                    </div>
                    <span
                      className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(
                        prescription.status
                      )}`}
                    >
                      {prescription.status.charAt(0).toUpperCase() +
                        prescription.status.slice(1)}
                    </span>
                  </div>

                  <div className="flex items-center gap-4 mt-2 text-sm text-slate-600 dark:text-slate-400">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      {new Date(prescription.date).toLocaleDateString()}
                    </div>
                    <div className="flex items-center gap-1">
                      <Pill className="w-4 h-4" />
                      {prescription.medications.length} medication
                      {prescription.medications.length !== 1 ? 's' : ''}
                    </div>
                  </div>
                </div>
              </button>

              {/* Expandable Details */}
              {expandedPrescription === prescription.id && (
                <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-700 space-y-4">
                  {/* Diagnosis */}
                  <div>
                    <h4 className="font-semibold text-slate-900 dark:text-white mb-2">
                      Diagnosis
                    </h4>
                    <p className="text-slate-700 dark:text-slate-300">
                      {prescription.diagnosis}
                    </p>
                  </div>

                  {/* Medications */}
                  <div>
                    <h4 className="font-semibold text-slate-900 dark:text-white mb-3">
                      Medications
                    </h4>
                    <div className="space-y-3">
                      {prescription.medications.map((med, idx) => (
                        <div
                          key={idx}
                          className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg border border-slate-200 dark:border-slate-600"
                        >
                          <div className="flex items-start justify-between mb-2">
                            <h5 className="font-semibold text-slate-900 dark:text-white">
                              {med.name}
                            </h5>
                            <span className="px-2 py-1 bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 text-xs font-medium rounded">
                              {med.dosage}
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-sm text-slate-600 dark:text-slate-400">
                            <div>
                              <span className="font-medium">Frequency:</span> {med.frequency}
                            </div>
                            <div>
                              <span className="font-medium">Duration:</span> {med.duration}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Notes */}
                  {prescription.notes && (
                    <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                      <p className="text-sm text-blue-900 dark:text-blue-200">
                        <span className="font-semibold">Doctor's Notes:</span>
                        <br />
                        {prescription.notes}
                      </p>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex gap-2 pt-4 flex-wrap">
                    <button className="btn-secondary flex items-center gap-2">
                      <Eye className="w-4 h-4" />
                      View Full Prescription
                    </button>
                    <button className="btn-secondary flex items-center gap-2">
                      <Download className="w-4 h-4" />
                      Download PDF
                    </button>
                    <button className="btn-secondary flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      Print
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))
        ) : (
          <div className="text-center py-12 card">
            <FileText className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
            <p className="text-slate-600 dark:text-slate-400">
              {searchTerm || filterStatus !== 'all'
                ? 'No prescriptions found matching your criteria'
                : 'No prescriptions yet. They will appear here when your doctors share them.'}
            </p>
          </div>
        )}
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="card w-full max-w-md">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">
              Upload Prescription
            </h2>

            <div className="space-y-4">
              <div className="border-2 border-dashed border-primary-300 dark:border-primary-700 rounded-lg p-8 text-center hover:bg-primary-50 dark:hover:bg-primary-900/10 transition-colors cursor-pointer">
                <Upload className="w-8 h-8 text-primary-600 dark:text-primary-400 mx-auto mb-2" />
                <p className="text-sm font-medium text-slate-900 dark:text-white">
                  Click to upload prescription
                </p>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                  or drag and drop (PDF, JPG, PNG)
                </p>
                <input
                  type="file"
                  className="hidden"
                  accept=".pdf,.jpg,.jpeg,.png"
                />
              </div>

              <div>
                <label htmlFor="prescriptionNumber" className="label">
                  Prescription Number (Optional)
                </label>
                <input
                  type="text"
                  id="prescriptionNumber"
                  placeholder="RX-2025-001"
                  className="input-field"
                />
              </div>

              <div>
                <label htmlFor="doctorName" className="label">
                  Doctor Name (Optional)
                </label>
                <input
                  type="text"
                  id="doctorName"
                  placeholder="Dr. Name"
                  className="input-field"
                />
              </div>

              <div className="flex gap-2 pt-4">
                <button
                  onClick={() => {
                    setShowUploadModal(false);
                    toast.success('Prescription uploaded successfully!');
                  }}
                  className="btn-primary flex-1"
                >
                  Upload
                </button>
                <button
                  onClick={() => setShowUploadModal(false)}
                  className="btn-secondary flex-1"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
