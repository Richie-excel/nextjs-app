'use server';

import { z } from 'zod';
import postgres from 'postgres';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { signIn } from '../auth';
import { AuthError } from 'next-auth';

const sql = postgres(process.env.POSTGRES_URL!, { ssl: 'require' });

const InvoiceFormSchema = z.object({
    id: z.string(),
    customerId: z.string({
        invalid_type_error: "Please select a customer"
    }),

    amount: z.coerce.number()
    .gt(0, { message: "Amount must be greater than $0" }),

    status: z.enum(['paid', 'pending'], {
        invalid_type_error: "Please select an invoice status"
    }),
    date:z.string(),
});

export type State = {
    errors?:{
        customerId?: string[],
        amount?: string[],
        status?: string[],
    },

    message?: string | null,
};

const CreateInvoice = InvoiceFormSchema.omit({ id: true, date: true });
const UpdateInvoice = InvoiceFormSchema.omit({ id: true, date: true });


export const createInvoice = async (prevState:State, formData: FormData) => {
    const validatedFields = CreateInvoice.safeParse({
        customerId: formData.get('customerId'),
        amount: formData.get('amount'),
        status: formData.get('status'),
    });

    if (!validatedFields.success) {
        return {
            errors: validatedFields.error.flatten().fieldErrors,
            message:"Missing fields. Failed to create invoice"
        }
    }

    const { customerId, amount, status } = validatedFields.data;

    const amountInCents = amount * 100;
    const date = new Date().toISOString().split('T')[0];
    
    try {
        
        await sql `
            INSERT INTO invoices (customer_id, amount, status, date)
            VALUES (${customerId}, ${amountInCents}, ${status}, ${date})
        `;
    } catch (error) {

        console.error('Error creating invoice:', error);
        return { message: "Failed to create invoice. Database error" };

    }
    
    revalidatePath('dashboard/invoices');
    redirect('/dashboard/invoices');

    
}

export const updateInvoice = async (id:string, prevState: State, formData: FormData) => {
    const validatedFields = UpdateInvoice.safeParse({
        id: formData.get('id'),
        customerId: formData.get('customerId'),
        amount: formData.get('amount'),
        status: formData.get('status'),
    });

    if(!validatedFields.success) {
        return {
            errors: validatedFields.error.flatten().fieldErrors,
            message: "Invalid fields. Failed to update invoice"
        }
    }

    const { amount, customerId, status } = validatedFields.data;
    const amountInCents = amount * 100;

    try {
        await sql `
            UPDATE invoices
            SET customer_id = ${customerId},
                amount = ${amountInCents},
                status = ${status},
            WHERE id = ${id}
        `;
    } catch (error) {
        console.log(error);

        return { message: "Failed to update invoice." };
        
    }

    revalidatePath('dashboard/invoices');
    redirect('/dashboard/invoices');
}

export const deleteInvoice = async (id: string) => {
    try {
        
        await sql `
            DELETE FROM invoices
            WHERE id = ${id}
        `;
    } catch (error) {
        console.log(error);
        
    }

    revalidatePath('dashboard/invoices');
    redirect('/dashboard/invoices');

}

export const authenticate = async (prevState: State, formData: FormData) => {
    try {
        await signIn('credentials', formData);
    } catch (error) {
        if (error instanceof AuthError) {
           switch (error.type) {
        case 'CredentialsSignin':
          return 'Invalid credentials.';
        default:
          return 'Something went wrong.';
      }
    }
    throw error;
    }
}
