'use client';

import { useState } from 'react';
import { Stethoscope, Search, Calendar, Clock, MapPin, Star, Video, Phone, MessageSquare, Plus } from 'lucide-react';
import { Doctor, Appointment } from '@/types';
import toast from 'react-hot-toast';

// Mock data
const MOCK_DOCTORS: Doctor[] = [
  {
    id: 1,
    name: 'Dr. Rajesh Kumar',
    specialization: 'General Practitioner',
    qualification: 'MBBS, MD',
    experience: 12,
    consultationFee: 500,
    rating: 4.8,
    totalConsultations: 2340,
    availability: 'Mon-Sat, 10AM-6PM',
    bio: 'Experienced general practitioner with 12 years of practice',
    languages: ['English', 'Tamil', 'Hindi'],
    location: 'Salem Medical Center',
  },
  {
    id: 2,
    name: 'Dr. Priya Sharma',
    specialization: 'Cardiologist',
    qualification: 'MBBS, MD, DM',
    experience: 15,
    consultationFee: 1000,
    rating: 4.9,
    totalConsultations: 1890,
    availability: 'Tue-Sun, 2PM-8PM',
    bio: 'Specialist in cardiac care and preventive cardiology',
    languages: ['English', 'Hindi'],
    location: 'Heart Care Clinic',
  },
  {
    id: 3,
    name: 'Dr. Vikram Singh',
    specialization: 'Orthopedic Surgeon',
    qualification: 'MBBS, MS, MCh',
    experience: 18,
    consultationFee: 800,
    rating: 4.7,
    totalConsultations: 2100,
    availability: 'Mon, Wed, Fri, 11AM-5PM',
    bio: 'Expert in joint replacement and sports medicine',
    languages: ['English', 'Hindi'],
    location: 'Bone & Joint Center',
  },
];

const MOCK_APPOINTMENTS: Appointment[] = [
  {
    id: 1,
    userId: 1,
    doctorId: 1,
    doctorName: 'Dr. Rajesh Kumar',
    appointmentDate: '2025-11-10',
    appointmentTime: '03:00 PM',
    status: 'scheduled',
    consultationType: 'video',
    symptoms: 'Mild cough and cold',
    createdAt: '2025-11-02T10:30:00Z',
  },
  {
    id: 2,
    userId: 1,
    doctorId: 2,
    doctorName: 'Dr. Priya Sharma',
    appointmentDate: '2025-11-08',
    appointmentTime: '04:30 PM',
    status: 'completed',
    consultationType: 'audio',
    prescription: 'Regular checkup completed. Continue current medication.',
    notes: 'Patient is doing well. Follow up after 3 months.',
    createdAt: '2025-10-25T14:20:00Z',
  },
];

export function ConsultationsSection() {
  const [doctors, setDoctors] = useState<Doctor[]>(MOCK_DOCTORS);
  const [appointments, setAppointments] = useState<Appointment[]>(MOCK_APPOINTMENTS);
  const [activeTab, setActiveTab] = useState<'browse' | 'appointments'>('appointments');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSpecialization, setFilterSpecialization] = useState<string>('all');
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [bookingData, setBookingData] = useState({
    date: '',
    time: '',
    consultationType: 'video' as const,
    symptoms: '',
  });

  const specializations = [...new Set(doctors.map((d) => d.specialization))];

  const filteredDoctors = doctors.filter((doctor) => {
    const matchesSearch =
      doctor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doctor.specialization.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSpecialization =
      filterSpecialization === 'all' || doctor.specialization === filterSpecialization;
    return matchesSearch && matchesSpecialization;
  });

  const handleBookAppointment = (doctor: Doctor) => {
    setSelectedDoctor(doctor);
    setShowBookingForm(true);
  };

  const handleSubmitBooking = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDoctor || !bookingData.date || !bookingData.time) {
      toast.error('Please fill all fields');
      return;
    }

    const newAppointment: Appointment = {
      id: appointments.length + 1,
      userId: 1,
      doctorId: selectedDoctor.id,
      doctorName: selectedDoctor.name,
      appointmentDate: bookingData.date,
      appointmentTime: bookingData.time,
      status: 'scheduled',
      consultationType: bookingData.consultationType,
      symptoms: bookingData.symptoms,
      createdAt: new Date().toISOString(),
    };

    setAppointments([...appointments, newAppointment]);
    toast.success('Appointment booked successfully!');
    setShowBookingForm(false);
    setSelectedDoctor(null);
    setBookingData({
      date: '',
      time: '',
      consultationType: 'video',
      symptoms: '',
    });
  };

  const handleCancelAppointment = (appointmentId: number) => {
    setAppointments(
      appointments.map((apt) =>
        apt.id === appointmentId ? { ...apt, status: 'cancelled' } : apt
      )
    );
    toast.success('Appointment cancelled');
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
          Consultations
        </h1>
        <p className="mt-2 text-slate-600 dark:text-slate-400">
          Book and manage doctor consultations
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-slate-200 dark:border-slate-700">
        <button
          onClick={() => setActiveTab('appointments')}
          className={`px-4 py-3 font-medium border-b-2 transition-colors ${
            activeTab === 'appointments'
              ? 'border-primary-600 text-primary-600 dark:text-primary-400'
              : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          My Appointments
        </button>
        <button
          onClick={() => setActiveTab('browse')}
          className={`px-4 py-3 font-medium border-b-2 transition-colors ${
            activeTab === 'browse'
              ? 'border-primary-600 text-primary-600 dark:text-primary-400'
              : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          Browse Doctors
        </button>
      </div>

      {/* My Appointments Tab */}
      {activeTab === 'appointments' && (
        <div className="space-y-4">
          {appointments.length > 0 ? (
            appointments.map((appointment) => (
              <div key={appointment.id} className="card">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                        {appointment.doctorName}
                      </h3>
                      <span
                        className={`px-2 py-1 rounded text-xs font-semibold ${
                          appointment.status === 'scheduled'
                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                            : appointment.status === 'completed'
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                            : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                        }`}
                      >
                        {appointment.status.charAt(0).toUpperCase() +
                          appointment.status.slice(1)}
                      </span>
                    </div>

                    <div className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        {new Date(appointment.appointmentDate).toLocaleDateString()}
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        {appointment.appointmentTime}
                      </div>
                      <div className="flex items-center gap-2">
                        {appointment.consultationType === 'video' && (
                          <>
                            <Video className="w-4 h-4" />
                            Video Call
                          </>
                        )}
                        {appointment.consultationType === 'audio' && (
                          <>
                            <Phone className="w-4 h-4" />
                            Audio Call
                          </>
                        )}
                        {appointment.consultationType === 'chat' && (
                          <>
                            <MessageSquare className="w-4 h-4" />
                            Chat
                          </>
                        )}
                      </div>
                    </div>

                    {appointment.symptoms && (
                      <p className="mt-3 text-sm text-slate-700 dark:text-slate-300">
                        <span className="font-medium">Symptoms:</span> {appointment.symptoms}
                      </p>
                    )}

                    {appointment.prescription && (
                      <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded">
                        <p className="text-sm text-blue-900 dark:text-blue-200">
                          <span className="font-medium">Prescription:</span>{' '}
                          {appointment.prescription}
                        </p>
                      </div>
                    )}
                  </div>

                  {appointment.status === 'scheduled' && (
                    <button
                      onClick={() => handleCancelAppointment(appointment.id)}
                      className="px-4 py-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-12 card">
              <Calendar className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
              <p className="text-slate-600 dark:text-slate-400">
                No appointments scheduled. Book one now!
              </p>
            </div>
          )}
        </div>
      )}

      {/* Browse Doctors Tab */}
      {activeTab === 'browse' && (
        <div className="space-y-6">
          {/* Search and Filter */}
          <div className="card space-y-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search doctors by name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="input-field pl-10"
                />
              </div>

              <select
                value={filterSpecialization}
                onChange={(e) => setFilterSpecialization(e.target.value)}
                className="input-field"
              >
                <option value="all">All Specializations</option>
                {specializations.map((spec) => (
                  <option key={spec} value={spec}>
                    {spec}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Doctors Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredDoctors.length > 0 ? (
              filteredDoctors.map((doctor) => (
                <div key={doctor.id} className="card hover:shadow-lg transition-shadow">
                  <div className="mb-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-primary-400 to-primary-600 rounded-full flex items-center justify-center mb-3">
                      <Stethoscope className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                      {doctor.name}
                    </h3>
                    <p className="text-sm text-primary-600 dark:text-primary-400 font-medium">
                      {doctor.specialization}
                    </p>
                  </div>

                  <div className="space-y-2 mb-4 text-sm text-slate-600 dark:text-slate-400">
                    <p className="flex items-center gap-2">
                      <span className="font-medium text-slate-900 dark:text-white">
                        {doctor.experience} yrs
                      </span>
                      experience
                    </p>
                    <p className="flex items-center gap-2">
                      <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                      <span className="font-medium">{doctor.rating}</span>
                      ({doctor.totalConsultations} consultations)
                    </p>
                    <p className="flex items-center gap-2">
                      <MapPin className="w-4 h-4" />
                      {doctor.location}
                    </p>
                  </div>

                  <div className="mb-4 p-3 bg-slate-50 dark:bg-slate-700/50 rounded">
                    <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">
                      Availability:
                    </p>
                    <p className="text-sm font-medium text-slate-900 dark:text-white">
                      {doctor.availability}
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-700">
                    <div>
                      <p className="text-xs text-slate-600 dark:text-slate-400">
                        Consultation Fee
                      </p>
                      <p className="text-xl font-bold text-slate-900 dark:text-white">
                        ₹{doctor.consultationFee}
                      </p>
                    </div>
                    <button
                      onClick={() => handleBookAppointment(doctor)}
                      className="btn-primary"
                    >
                      <Plus className="w-4 h-4" />
                      Book
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-full text-center py-12 card">
                <Stethoscope className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
                <p className="text-slate-600 dark:text-slate-400">
                  No doctors found. Try adjusting your search.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Booking Modal */}
      {showBookingForm && selectedDoctor && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="card w-full max-w-md">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">
              Book Appointment with {selectedDoctor.name}
            </h2>

            <form onSubmit={handleSubmitBooking} className="space-y-4">
              <div>
                <label htmlFor="date" className="label">
                  Date
                </label>
                <input
                  type="date"
                  id="date"
                  value={bookingData.date}
                  onChange={(e) =>
                    setBookingData({ ...bookingData, date: e.target.value })
                  }
                  className="input-field"
                  required
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>

              <div>
                <label htmlFor="time" className="label">
                  Time
                </label>
                <input
                  type="time"
                  id="time"
                  value={bookingData.time}
                  onChange={(e) =>
                    setBookingData({ ...bookingData, time: e.target.value })
                  }
                  className="input-field"
                  required
                />
              </div>

              <div>
                <label htmlFor="consultationType" className="label">
                  Consultation Type
                </label>
                <select
                  id="consultationType"
                  value={bookingData.consultationType}
                  onChange={(e) =>
                    setBookingData({
                      ...bookingData,
                      consultationType: e.target.value as any,
                    })
                  }
                  className="input-field"
                >
                  <option value="video">Video Call</option>
                  <option value="audio">Audio Call</option>
                  <option value="chat">Chat</option>
                </select>
              </div>

              <div>
                <label htmlFor="symptoms" className="label">
                  Symptoms / Concerns
                </label>
                <textarea
                  id="symptoms"
                  value={bookingData.symptoms}
                  onChange={(e) =>
                    setBookingData({ ...bookingData, symptoms: e.target.value })
                  }
                  placeholder="Describe your symptoms..."
                  className="input-field min-h-24"
                />
              </div>

              <div className="flex gap-2 pt-4">
                <button type="submit" className="btn-primary flex-1">
                  Confirm Booking
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowBookingForm(false);
                    setSelectedDoctor(null);
                    setBookingData({
                      date: '',
                      time: '',
                      consultationType: 'video',
                      symptoms: '',
                    });
                  }}
                  className="btn-secondary flex-1"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
