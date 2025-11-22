export function Footer() {
  return (
    <footer className="border-t bg-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-purple-500 to-blue-500" />
            <span className="text-xl font-bold">Webyalaya</span>
          </div>
          <p className="text-sm text-muted-foreground text-center">
            Empowering peer-to-peer learning worldwide
          </p>
        </div>
      </div>
    </footer>
  );
}
