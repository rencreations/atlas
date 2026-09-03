// Small icons for the provider/service choices in godmode (email, SMS,
// integrations). Well-known consumer brands already have hand-drawn marks
// in oauth-logos.tsx; the developer-tool services here don't have a
// stable public path source, so they get a colored monogram badge instead
// of a guessed (and possibly wrong) logo shape.
import type { ComponentType } from 'react';
import { Mail, Terminal } from 'lucide-react';

interface LogoProps {
  className?: string;
  size?: number;
}

function monogram(text: string, bg: string, fg = '#ffffff') {
  return function MonogramLogo({ className, size = 18 }: LogoProps) {
    const fontSize = Math.max(6, Math.round((size * 1.55) / text.length));
    return (
      <span
        role="presentation"
        aria-hidden
        className={className}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: size,
          height: size,
          borderRadius: Math.round(size * 0.28),
          background: bg,
          color: fg,
          fontSize,
          fontWeight: 700,
          lineHeight: 1,
          letterSpacing: '-0.02em',
        }}
      >
        {text}
      </span>
    );
  };
}

const ConsoleLogo: ComponentType<LogoProps> = ({ className, size = 18 }) => (
  <Terminal className={className} size={size} strokeWidth={2.25} />
);
const SmtpLogo: ComponentType<LogoProps> = ({ className, size = 18 }) => (
  <Mail className={className} size={size} strokeWidth={2.25} />
);

export const EMAIL_PROVIDER_LOGOS: Record<string, ComponentType<LogoProps>> = {
  console: ConsoleLogo,
  smtp: SmtpLogo,
  resend: monogram('re', '#000000'),
  ses: monogram('SES', '#ff9900', '#111827'),
};

export const SMS_PROVIDER_LOGOS: Record<string, ComponentType<LogoProps>> = {
  console: ConsoleLogo,
  twilio: monogram('Tw', '#f22f46'),
  vonage: monogram('Vo', '#7c3aed'),
  infobip: monogram('In', '#ff554a'),
  sinch: monogram('Si', '#0a6cff'),
  messagebird: monogram('MB', '#2481d7'),
};

export const INTEGRATION_LOGOS: Record<string, ComponentType<LogoProps>> = {
  n8n: monogram('n8n', '#ea4b71'),
  klipy: monogram('KL', '#7c3aed'),
};
