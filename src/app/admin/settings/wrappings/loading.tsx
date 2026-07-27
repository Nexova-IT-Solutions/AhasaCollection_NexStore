export default function WrappingsLoading() {
  return (
    <div className="space-y-8 animate-pulse w-full bg-[#FAFAFA] py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-[1600px] mx-auto px-4 md:px-8 lg:px-10 space-y-8">
        {/* Page Header */}
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div className="space-y-2">
            <div className="h-8 w-72 bg-gray-200 rounded-lg" />
            <div className="h-4 w-96 bg-gray-100 rounded-md" />
            <div className="h-3.5 w-40 bg-gray-100 rounded-md" />
          </div>
          <div className="h-10 w-36 bg-gray-200 rounded-xl" />
        </div>

        {/* Wrappings Cards Grid */}
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {[1, 2, 3].map((item) => (
            <div key={item} className="rounded-2xl border border-gray-150 bg-white shadow-sm overflow-hidden p-4 space-y-3">
              {/* Image Preview Area */}
              <div className="rounded-xl border border-gray-150 bg-gray-100 h-40 w-full flex items-center justify-center" />
              
              {/* Info Row */}
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-2">
                  <div className="h-5 w-36 bg-gray-250 rounded-md" />
                  <div className="h-4 w-24 bg-gray-200 rounded-md" />
                </div>
                <div className="h-5 w-16 bg-gray-150 rounded-full" />
              </div>

              {/* Description Placeholder */}
              <div className="space-y-1.5 pt-1">
                <div className="h-3.5 w-full bg-gray-100 rounded-md" />
                <div className="h-3.5 w-2/3 bg-gray-100 rounded-md" />
              </div>

              {/* Actions Footer */}
              <div className="flex items-center gap-2 pt-3">
                <div className="h-8 w-16 bg-gray-100 rounded-md" />
                <div className="h-8 w-20 bg-gray-100 rounded-md" />
                <div className="h-8 w-20 bg-gray-100 rounded-md" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
