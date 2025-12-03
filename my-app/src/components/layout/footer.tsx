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
              className="object-contain px-1"
              priority={false}
            />
          </div>
        </div>
        <p className="text-xs text-muted-foreground text-center mt-4 font-tagline">
          © {new Date().getFullYear()} Humitra Pvt Ltd. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
