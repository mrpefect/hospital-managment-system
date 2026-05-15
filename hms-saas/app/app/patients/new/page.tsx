import { NewPatientForm } from './NewPatientForm'

export default function NewPatientPage() {
  return (
    <div className="p-8 max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900" style={{ fontFamily: 'var(--font-lato)' }}>
          Register New Patient
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">Fill in the patient's details. MRN is auto-assigned.</p>
      </div>
      <NewPatientForm />
    </div>
  )
}
