import { NewDrugForm } from './NewDrugForm'

export default function NewDrugPage() {
  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-3xl">
      <div className="mb-6">
        <h1
          className="text-2xl font-bold text-slate-900"
          style={{ fontFamily: 'var(--font-lato)' }}
        >
          Add New Drug
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Add a drug to the pharmacy catalog. Stock batches can be added separately.
        </p>
      </div>
      <NewDrugForm />
    </div>
  )
}
