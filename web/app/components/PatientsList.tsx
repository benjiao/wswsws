'use client';
import { useState, useEffect } from 'react';

interface Patient {
  id: number;
  name: string;
  birth_date: string | null;
  rescued_date: string | null;
  color: string | null;
  sex: number | null;
  sex_display: string;
  created_at: string;
  updated_at: string;
}

export default function PatientsList() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPatients = async () => {
      try {
        setLoading(true);
        const response = await fetch('http://localhost:8000/patients/', {
          headers: { 'Accept': 'application/json' }
        });
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        setPatients(data.results || data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch patients');
        console.error('Error fetching patients:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchPatients();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading patients...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="text-red-500">
            <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <h3 className="mt-4 text-lg font-medium">Error loading patients</h3>
            <p className="mt-2 text-sm text-gray-500">{error}</p>
            <button 
              onClick={() => window.location.reload()} 
              className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Try again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Patients</h1>
              <p className="mt-1 text-sm text-gray-500">
                {patients.length} patient{patients.length !== 1 ? 's' : ''} total
              </p>
            </div>
            <button className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
              <svg className="-ml-1 mr-2 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Add Patient
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {patients.length === 0 ? (
          <div className="text-center py-12">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <h3 className="mt-4 text-lg font-medium text-gray-900">No patients</h3>
            <p className="mt-2 text-sm text-gray-500">Get started by adding your first patient.</p>
            <div className="mt-6">
              <button className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700">
                Add Patient
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {patients.map((patient) => (
              <div key={patient.id} className="bg-white overflow-hidden shadow rounded-lg hover:shadow-lg transition-shadow duration-200">
                <div className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                          <svg className="h-6 w-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                        </div>
                      </div>
                      <div className="ml-4">
                        <h3 className="text-lg font-medium text-gray-900 truncate">
                          {patient.name}
                        </h3>
                        <p className="text-sm text-gray-500">ID: #{patient.id}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-4 space-y-2">
                    {patient.sex_display && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Sex:</span>
                        <span className="text-gray-900 font-medium">{patient.sex_display}</span>
                      </div>
                    )}
                    {patient.color && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Color:</span>
                        <span className="text-gray-900 font-medium">{patient.color}</span>
                      </div>
                    )}
                    {patient.birth_date && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Birth Date:</span>
                        <span className="text-gray-900 font-medium">
                          {new Date(patient.birth_date).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                    {patient.rescued_date && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Rescued:</span>
                        <span className="text-gray-900 font-medium">
                          {new Date(patient.rescued_date).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="mt-6 flex space-x-3">
                    <button className="flex-1 bg-blue-50 text-blue-700 text-xs font-medium py-2 px-3 rounded-md hover:bg-blue-100 transition-colors">
                      View Details
                    </button>
                    <button className="flex-1 bg-green-50 text-green-700 text-xs font-medium py-2 px-3 rounded-md hover:bg-green-100 transition-colors">
                      Treatments
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}