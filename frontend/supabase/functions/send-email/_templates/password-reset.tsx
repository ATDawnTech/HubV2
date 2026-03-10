import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Text,
} from 'npm:@react-email/components@0.0.22'
import * as React from 'npm:react@18.3.1'

interface PasswordResetEmailProps {
  supabase_url: string
  email_action_type: string
  token_hash: string
  token: string
}

export const PasswordResetEmail = ({
  token,
  supabase_url,
  email_action_type,
  token_hash,
}: PasswordResetEmailProps) => (
  <Html>
    <Head />
    <Preview>Reset your ADT Hub password</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Reset Your Password</Heading>

        <Text style={text}>
          You requested to reset your password for ADT Hub. Click the link below to set a new password:
        </Text>

        <Link
          href={`${supabase_url}/auth/v1/verify?token=${token_hash}&type=${email_action_type}&redirect_to=${encodeURIComponent(
            'https://d2elveiylf795j.cloudfront.net'
          )}`}
          target="_blank"
          style={{
            ...link,
            display: 'block',
            marginBottom: '16px',
            backgroundColor: '#007bff',
            color: 'white',
            padding: '12px 24px',
            borderRadius: '6px',
            textDecoration: 'none',
            textAlign: 'center' as const,
          }}
        >
          Reset Password
        </Link>

        <Text style={{ ...text, marginBottom: '14px' }}>
          Or, copy and paste this temporary reset code:
        </Text>

        <code style={code}>{token}</code>

        <Text
          style={{
            ...text,
            color: '#ababab',
            marginTop: '14px',
            marginBottom: '16px',
          }}
        >
          If you didn&apos;t request a password reset, you can safely ignore this email.
        </Text>

        <Text style={footer}>
          <Link
            href="https://atdawntech.com"
            target="_blank"
            style={{ ...link, color: '#898989' }}
          >
            AT Dawn Technologies
          </Link>
          <br />
          ADT Hub - Your HR Management Platform
        </Text>
      </Container>
    </Body>
  </Html>
)

export default PasswordResetEmail

const main = {
  backgroundColor: '#ffffff',
}

const container = {
  paddingLeft: '12px',
  paddingRight: '12px',
  margin: '0 auto',
}
