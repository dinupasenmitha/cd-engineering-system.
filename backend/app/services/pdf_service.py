import os
from datetime import datetime
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from app.core.config import settings
from app.db.models import Invoice, Job, Customer

def generate_invoice_pdf(invoice: Invoice, job: Job, customer: Customer) -> str:
    filename = f"Invoice_{invoice.invoice_number}.pdf"
    filepath = os.path.join(settings.UPLOAD_DIR, filename)
    
    doc = SimpleDocTemplate(filepath, pagesize=letter,
                            rightMargin=72, leftMargin=72,
                            topMargin=72, bottomMargin=18)
    
    Story = []
    styles = getSampleStyleSheet()
    styles.add(ParagraphStyle(name='RightAlign', alignment=2))
    
    # Header
    Story.append(Paragraph("CD Engineering - Invoice", styles['Title']))
    Story.append(Spacer(1, 12))
    
    # Customer Info
    Story.append(Paragraph(f"<b>Customer:</b> {customer.name}", styles['Normal']))
    Story.append(Paragraph(f"<b>Phone:</b> {customer.phone}", styles['Normal']))
    if customer.address:
        Story.append(Paragraph(f"<b>Address:</b> {customer.address}", styles['Normal']))
    Story.append(Spacer(1, 12))
    
    # Invoice Details
    Story.append(Paragraph(f"<b>Invoice #:</b> {invoice.invoice_number}", styles['Normal']))
    Story.append(Paragraph(f"<b>Date:</b> {invoice.created_at.strftime('%Y-%m-%d')}", styles['Normal']))
    Story.append(Paragraph(f"<b>Status:</b> {invoice.status}", styles['Normal']))
    Story.append(Spacer(1, 24))
    
    # Costs Table
    data = [
        ['Description', 'Amount (Rs.)'],
        ['Parts Cost', f"{invoice.parts_cost:.2f}"],
        ['Labor Cost', f"{invoice.labor_cost:.2f}"],
        ['Transport Cost', f"{invoice.transport_cost:.2f}"],
        ['Subtotal', f"{invoice.subtotal:.2f}"],
        [f"Overhead ({invoice.overhead_percent}%)", f"{invoice.overhead_amount:.2f}"],
        [f"Profit ({invoice.profit_percent}%)", f"{invoice.profit_amount:.2f}"],
        ['TOTAL', f"{invoice.total:.2f}"]
    ]
    
    t = Table(data, colWidths=[300, 150])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (1,0), colors.grey),
        ('TEXTCOLOR', (0,0), (1,0), colors.whitesmoke),
        ('ALIGN', (0,0), (-1,-1), 'LEFT'),
        ('ALIGN', (1,0), (1,-1), 'RIGHT'),
        ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
        ('BOTTOMPADDING', (0,0), (-1,0), 12),
        ('BACKGROUND', (0,-1), (1,-1), colors.lightgrey),
        ('FONTNAME', (0,-1), (1,-1), 'Helvetica-Bold'),
        ('GRID', (0,0), (-1,-1), 1, colors.black)
    ]))
    
    Story.append(t)
    Story.append(Spacer(1, 48))
    
    # Footer
    Story.append(Paragraph("Thank you for your business!", styles['Normal']))
    
    doc.build(Story)
    return filepath

def generate_job_sheet_pdf(job: Job, customer: Customer) -> str:
    filename = f"JobSheet_{job.job_number}.pdf"
    filepath = os.path.join(settings.UPLOAD_DIR, filename)
    
    doc = SimpleDocTemplate(filepath, pagesize=letter)
    Story = []
    styles = getSampleStyleSheet()
    
    Story.append(Paragraph(f"Job Sheet - {job.job_number}", styles['Title']))
    Story.append(Spacer(1, 12))
    
    Story.append(Paragraph(f"<b>Customer:</b> {customer.name} ({customer.phone})", styles['Normal']))
    Story.append(Paragraph(f"<b>Date:</b> {job.date}", styles['Normal']))
    Story.append(Paragraph(f"<b>Service Type:</b> {job.service_type}", styles['Normal']))
    Story.append(Paragraph(f"<b>Status:</b> {job.status}", styles['Normal']))
    Story.append(Spacer(1, 12))
    
    Story.append(Paragraph(f"<b>Description:</b>", styles['Normal']))
    Story.append(Paragraph(f"{job.description or 'N/A'}", styles['Normal']))
    Story.append(Spacer(1, 24))
    
    Story.append(Paragraph(f"<b>Technician Signature:</b> ___________________________", styles['Normal']))
    Story.append(Spacer(1, 24))
    Story.append(Paragraph(f"<b>Customer Signature:</b> ___________________________", styles['Normal']))
    
    doc.build(Story)
    return filepath
