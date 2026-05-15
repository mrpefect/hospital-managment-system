import { NewDoctorForm } from './NewDoctorForm'

export const dynamic = 'force-dynamic'

export default function NewDoctorPage() {
  return (
    <div className="p-8 max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900" style={{ fontFamily: 'var(--font-lato)' }}>
          Add New Doctor
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Create a doctor profile. A login account will be provisioned with the provided email.
        </p>
      </div>
      <NewDoctorForm />
    </div>
  )
}
