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
  Hr,
} from 'npm:@react-email/components@0.0.22'
import * as React from 'npm:react@18.3.1'

interface TaskAssignmentEmailProps {
  assigneeName: string
  taskName: string
  candidateName: string
  dueDate: string
  taskDescription?: string
  siteUrl: string
}

export const TaskAssignmentEmail = ({
  assigneeName,
  taskName,
  candidateName,
  dueDate,
  taskDescription,
  siteUrl,
}: TaskAssignmentEmailProps) => {
  const formattedDueDate = new Date(dueDate).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })

  return (
    <Html>
      <Head />
      <Preview>New task assigned: {taskName} for {candidateName}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>New Task Assignment</Heading>
          
          <Text style={text}>
            Hi {assigneeName},
          </Text>
          
          <Text style={text}>
            You have been assigned a new onboarding task:
          </Text>
          
          <Section style={taskSection}>
            <Text style={taskTitle}>{taskName}</Text>
            <Text style={taskDetail}>
              <strong>Candidate:</strong> {candidateName}
            </Text>
            <Text style={taskDetail}>
              <strong>Due Date:</strong> {formattedDueDate}
            </Text>
            {taskDescription && (
              <Text style={taskDetail}>
                <strong>Description:</strong> {taskDescription}
              </Text>
            )}
          </Section>
          
          <Text style={text}>
            Please log in to the onboarding system to view and manage this task.
          </Text>
          
          <Link
            href={siteUrl}
            target="_blank"
            style={button}
          >
            Go to Onboarding System
          </Link>
          
          <Hr style={hr} />
          
          <Text style={footer}>
            This is an automated notification from the onboarding system.
            If you have any questions, please contact your manager.
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export default TaskAssignmentEmail

const main = {
  backgroundColor: '#ffffff',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", "Oxygen", "Ubuntu", "Cantarell", "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif',
}

const container = {
  margin: '0 auto',
  padding: '20px 0 48px',
  maxWidth: '560px',
}

const h1 = {
  color: '#333',
  fontSize: '24px',
  fontWeight: 'bold',
  margin: '40px 0 20px',
  padding: '0',
}

const text = {
  color: '#333',
  fontSize: '14px',
  lineHeight: '24px',
  margin: '16px 0',
}

const taskSection = {
  backgroundColor: '#f8f9fa',
  borderRadius: '8px',
  padding: '24px',
  margin: '24px 0',
  border: '1px solid #e9ecef',
}

const taskTitle = {
  color: '#1a1a1a',
  fontSize: '18px',
  fontWeight: 'bold',
  margin: '0 0 16px 0',
}

const taskDetail = {
  color: '#333',
  fontSize: '14px',
  lineHeight: '20px',
  margin: '8px 0',
}

const button = {
  backgroundColor: '#0066cc',
  color: '#ffffff',
  fontSize: '14px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '12px 24px',
  borderRadius: '6px',
  margin: '16px 0',
}

const hr = {
  borderColor: '#e9ecef',
  margin: '32px 0',
}

const footer = {
  color: '#898989',
  fontSize: '12px',
  lineHeight: '16px',
  margin: '16px 0',
}