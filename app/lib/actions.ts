'use server';

import { z } from 'zod';
import postgres from 'postgres';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

const sql = postgres(process.env.POSTGRES_URL!, { ssl: 'require' });

const InvoiceFormSchema = z.object({
    id: z.string(),
    customerId: z.string().min(1, 'Customer is required'),
    amount: z.coerce.number().min(0.01, 'Amount must be greater than 0'),
    status: z.enum(['paid', 'pending']),
    date:z.string(),
});

const CreateInvoice = InvoiceFormSchema.omit({ id: true, date: true });
const UpdateInvoice = InvoiceFormSchema.omit({ id: true, date: true });


export const createInvoice = async (formData: FormData) => {
    const { customerId, amount, status } = CreateInvoice.parse({
        customerId: formData.get('customerId'),
        amount: formData.get('amount'),
        status: formData.get('status'),
    });

    const amountInCents = amount * 100;
    const date = new Date().toISOString().split('T')[0];
    
    try {
        
        await sql `
            INSERT INTO invoices (customer_id, amount, status, date)
            VALUES (${customerId}, ${amountInCents}, ${status}, ${date})
        `;
    } catch (error) {

        console.error('Error creating invoice:', error);
        return { message: "Failed to create invoice.", reason: 'Database error' };

    }
    
    revalidatePath('dashboard/invoices');
    redirect('/dashboard/invoices');

    
}

export const updateInvoice = async (id:string, formData: FormData) => {
    const { customerId, amount, status } = UpdateInvoice.parse({
        id: formData.get('id'),
        customerId: formData.get('customerId'),
        amount: formData.get('amount'),
        status: formData.get('status'),
    });
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
