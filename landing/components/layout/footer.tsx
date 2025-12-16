import Image from "next/image";
import Link from "next/link";
import { Linkedin, Twitter, Facebook, Instagram, Youtube, Briefcase } from "lucide-react";

export function Footer() {
  const socialLinks = [
    { icon: Linkedin, label: "LinkedIn", url: "https://www.linkedin.com/company/webyalaya/?viewAsMember=true" },
    { icon: Twitter, label: "Twitter", url: "https://www.humitra.com" },
    { icon: Facebook, label: "Facebook", url: "https://www.humitra.com" },
    { icon: Instagram, label: "Instagram", url: "https://www.humitra.com" },
    { icon: Youtube, label: "YouTube", url: "https://www.humitra.com" },
  ];

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
        
        {/* Social Media Links and Career Link */}
        <div className="flex flex-col items-center gap-4 mt-6">
          <div className="flex items-center gap-4 flex-wrap justify-center">
            {socialLinks.map(({ icon: Icon, label, url }) => (
              <Link
                key={label}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-green-600 transition-colors duration-200"
                aria-label={label}
              >
                <Icon className="w-5 h-5" />
              </Link>
            ))}
          </div>
          
          <Link
            href="https://www.humitra.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-muted-foreground hover:text-green-600 transition-colors duration-200 text-sm font-medium font-tagline"
          >
            <Briefcase className="w-4 h-4" />
            Careers
          </Link>
        </div>

        <p className="text-xs text-muted-foreground text-center mt-4 font-tagline">
          © {new Date().getFullYear()} Humitra Pvt Ltd. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
