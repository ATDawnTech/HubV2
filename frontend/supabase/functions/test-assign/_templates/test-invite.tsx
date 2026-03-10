import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Text,
  Section,
  Img,
} from 'npm:@react-email/components@0.0.22';
import * as React from 'npm:react@18.3.1';

interface TestInviteEmailProps {
  candidateName: string;
  testName: string;
  testLink: string;
  expiryDate: string;
  duration: number;
}

export const TestInviteEmail = ({
  candidateName,
  testName,
  testLink,
  expiryDate,
  duration,
}: TestInviteEmailProps) => (
  <Html>
    <Head />
    <Preview>Your AT Dawn Technologies assessment is ready</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}>
          <Img
            src="https://wfxpuzgtqbmobfyakcrg.supabase.co/storage/v1/object/public/employee-photos/at-dawn-logo.png"
            width="200"
            height="50"
            alt="AT Dawn Technologies"
            style={logo}
          />
        </Section>
        
        <Heading style={h1}>Assessment Invitation</Heading>
        
        <Text style={text}>
          Hello {candidateName},
        </Text>
        
        <Text style={text}>
          You've been invited to complete the <strong>{testName}</strong> assessment as part of your application process with AT Dawn Technologies.
        </Text>
        
        <Section style={infoBox}>
          <Text style={infoText}>
            <strong>Duration:</strong> {duration} minutes<br/>
            <strong>Expires:</strong> {expiryDate}
          </Text>
        </Section>
        
        <Text style={text}>
          <strong>Important Requirements:</strong>
        </Text>
        <Text style={text}>
          • Ensure you have a stable internet connection<br/>
          • Allow camera access when prompted<br/>
          • Find a quiet, well-lit environment<br/>
          • Have a valid ID ready for verification<br/>
          • Your webcam must remain on throughout the test
        </Text>
        
        <Section style={buttonContainer}>
          <Link href={testLink} style={button}>
            Start Assessment
          </Link>
        </Section>
        
        <Text style={text}>
          Or copy and paste this link in your browser:
        </Text>
        <Text style={linkText}>{testLink}</Text>
        
        <Text style={footerText}>
          If you have any questions or technical issues, please contact our support team.
        </Text>
        
        <Text style={footer}>
          Best regards,<br/>
          AT Dawn Technologies Team
        </Text>
      </Container>
    </Body>
  </Html>
);

export default TestInviteEmail;

const main = {
  backgroundColor: '#f6f9fc',
  fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '20px 0 48px',
  marginBottom: '64px',
};

const header = {
  padding: '20px 40px',
  borderBottom: '1px solid #e6ebf1',
};

const logo = {
  margin: '0 auto',
  display: 'block',
};

const h1 = {
  color: '#1a1a1a',
  fontSize: '28px',
  fontWeight: 'bold',
  margin: '40px 40px 20px',
  padding: '0',
};

const text = {
  color: '#374151',
  fontSize: '16px',
  lineHeight: '24px',
  margin: '16px 40px',
};

const infoBox = {
  backgroundColor: '#f8fafc',
  border: '1px solid #e2e8f0',
  borderRadius: '8px',
  margin: '24px 40px',
  padding: '16px',
};

const infoText = {
  color: '#374151',
  fontSize: '14px',
  lineHeight: '20px',
  margin: '0',
};

const buttonContainer = {
  textAlign: 'center' as const,
  margin: '32px 40px',
};

const button = {
  backgroundColor: '#2563eb',
  borderRadius: '8px',
  color: '#ffffff',
  fontSize: '16px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '12px 32px',
};

const linkText = {
  color: '#2563eb',
  fontSize: '14px',
  margin: '16px 40px',
  wordBreak: 'break-all' as const,
};

const footerText = {
  color: '#6b7280',
  fontSize: '14px',
  lineHeight: '20px',
  margin: '32px 40px 16px',
};

const footer = {
  color: '#374151',
  fontSize: '14px',
  lineHeight: '20px',
  margin: '16px 40px 40px',
};