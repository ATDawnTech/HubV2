export interface N8nWebhookPayload {
    firstName: string;
    lastName: string;
    email: string;
    jobTitle: string;
    startDate: string;
    managerName: string;
}

export const triggerN8nWebhook = async (payload: N8nWebhookPayload) => {
    try {
        const response = await fetch('https://atdawn.app.n8n.cloud/webhook/49f61efa-6357-4808-bf2c-0a53e630d4a3', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        });
        return response.json();
    } catch (error) {
        console.error('Error triggering n8n webhook:', error);
        throw error;
    }
}
