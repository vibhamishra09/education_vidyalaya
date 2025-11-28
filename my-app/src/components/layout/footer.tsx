import Image from "next/image";

export function Footer() {
  return (
    <footer className="border-t bg-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col items-center gap-4">
          <div className="flex items-center gap-2">
            <Image
              src="/webyalaya-main-logo.svg"
              alt="Webyalaya logo"
              width={128}
              height={128}
              className="object-contain rounded-md px-1"
              priority={false}
            />
          </div>
          <p className="text-sm text-muted-foreground text-center">
            Empowering peer-to-peer learning worldwide
          </p>
        </div>
      </div>
    </footer>
  );
}
