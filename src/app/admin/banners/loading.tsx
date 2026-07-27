export default function BannersLoading() {
  return (
    <div className="space-y-8 animate-pulse w-full bg-[#FAFAFA] py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-[1600px] mx-auto px-4 md:px-8 lg:px-10 space-y-8">
        {/* Page Header */}
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gray-200 rounded-xl h-10 w-10" />
            <div className="h-8 w-60 bg-gray-250 rounded-lg" />
          </div>
          <div className="h-4 w-96 bg-gray-100 rounded-md" />
        </div>

        {/* Create / Edit Form Card */}
        <div className="rounded-2xl border border-gray-150 bg-white overflow-hidden shadow-sm">
          <div className="p-6 space-y-6">
            <div className="space-y-2">
              <div className="h-5 w-40 bg-gray-200 rounded-md" />
              <div className="h-3.5 w-80 bg-gray-100 rounded-md" />
            </div>

            <div className="space-y-2">
              <div className="h-3.5 w-24 bg-gray-150 rounded-md" />
              <div className="h-12 w-full bg-gray-50 border border-gray-150 rounded-xl" />
            </div>

            <div className="space-y-2">
              <div className="h-3.5 w-28 bg-gray-150 rounded-md" />
              <div className="h-36 w-full bg-gray-50 border-2 border-dashed border-gray-150 rounded-2xl flex flex-col items-center justify-center space-y-2">
                <div className="h-8 w-8 bg-gray-200 rounded-full" />
                <div className="h-4 w-48 bg-gray-200 rounded-md" />
                <div className="h-3.5 w-64 bg-gray-100 rounded-md" />
              </div>
            </div>

            <div className="flex items-center justify-between rounded-xl border border-gray-150 bg-gray-50/50 p-4">
              <div className="space-y-2">
                <div className="h-4 w-32 bg-gray-200 rounded-md" />
                <div className="h-3.5 w-64 bg-gray-100 rounded-md" />
              </div>
              <div className="h-6 w-11 bg-gray-200 rounded-full" />
            </div>

            <div className="flex gap-3 pt-2">
              <div className="h-12 w-36 bg-gray-200 rounded-xl" />
            </div>
          </div>
        </div>

        {/* Banners List Section */}
        <div className="space-y-4">
          <div className="h-6 w-40 bg-gray-250 rounded-md" />

          <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
            {[1, 2].map((i) => (
              <div key={i} className="overflow-hidden border border-gray-150 rounded-2xl shadow-sm bg-white">
                {/* Image Placeholder */}
                <div className="relative w-full h-48 bg-gray-100 flex items-center justify-center">
                  <div className="absolute top-3 left-3 flex items-center gap-2">
                    <div className="h-6 w-20 bg-gray-200 rounded-md" />
                    <div className="h-6 w-16 bg-gray-200 rounded-md" />
                  </div>
                </div>
                {/* Card Footer */}
                <div className="px-4 py-4 flex items-center justify-between border-t border-gray-100 bg-white">
                  <div className="space-y-2">
                    <div className="h-4.5 w-48 bg-gray-200 rounded-md" />
                    <div className="h-3.5 w-24 bg-gray-100 rounded-md" />
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="h-3.5 w-8 bg-gray-150 rounded-md" />
                    <div className="h-6 w-11 bg-gray-200 rounded-full" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
