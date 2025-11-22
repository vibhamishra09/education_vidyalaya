import { Webhook } from 'svix';
import { headers } from 'next/headers';
import { WebhookEvent } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  // Get the headers
  const headerPayload = await headers();
  const svix_id = headerPayload.get('svix-id');
  const svix_timestamp = headerPayload.get('svix-timestamp');
  const svix_signature = headerPayload.get('svix-signature');

  // If there are no headers, error out
  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response('Error occured -- no svix headers', {
      status: 400,
    });
  }

  // Get the body
  const payload = await req.text();
  // const body = JSON.parse(payload);

  // Create a new Svix instance with your secret.
  const wh = new Webhook(process.env.CLERK_WEBHOOK_SECRET || '');

  let evt: WebhookEvent;

  // Verify the payload with the headers
  try {
    evt = wh.verify(payload, {
      'svix-id': svix_id,
      'svix-timestamp': svix_timestamp,
      'svix-signature': svix_signature,
    }) as WebhookEvent;
  } catch (err) {
    console.error('Error verifying webhook:', err);
    return new Response('Error occured', {
      status: 400,
    });
  }

  // Handle the webhook
  const eventType = evt.type;

  if (eventType === 'user.created') {
    const { id, email_addresses, first_name, last_name } = evt.data;

    // Just log - the backend webhook handler will create the user
    console.log('User created:', { id, email: email_addresses[0]?.email_address, first_name, last_name });

    // Note: User will be created in database when they complete onboarding
    // or when the backend receives this webhook (if backend webhook is configured)
  }

  if (eventType === 'user.updated') {
    const { id, email_addresses, first_name, last_name } = evt.data;
    
    // Here you can add logic to update a user in your database
    console.log('User updated:', { id, email_addresses, first_name, last_name });
    
    // Example: Update user in your database
    // await updateUser(id, {
    //   email: email_addresses[0].email_address,
    //   firstName: first_name,
    //   lastName: last_name,
    // });
  }

  if (eventType === 'user.deleted') {
    const { id } = evt.data;
    
    // Here you can add logic to delete a user from your database
    console.log('User deleted:', id);
    
    // Example: Delete user from your database
    // await deleteUser(id);
  }

  return NextResponse.json({ message: 'Webhook received' });
}
