#!/usr/bin/env python3
"""
Create a fillable B2030 PDF by adding form fields to the existing flat PDF.
Uses pikepdf to add AcroForm fields.
"""
import pikepdf

INPUT = "docassemble/BankruptcyClinic/data/templates/form_b2030.pdf"
OUTPUT = "docassemble/BankruptcyClinic/data/templates/form_b2030.pdf"

def make_text_field(pdf, name, page, rect, font_size=10, multiline=False):
    flags = 0
    if multiline:
        flags |= (1 << 12)
    d = pikepdf.Dictionary()
    d["/Type"] = pikepdf.Name("/Annot")
    d["/Subtype"] = pikepdf.Name("/Widget")
    d["/FT"] = pikepdf.Name("/Tx")
    d["/T"] = pikepdf.String(name)
    d["/Rect"] = pikepdf.Array([rect[0], rect[1], rect[2], rect[3]])
    d["/P"] = page.obj
    d["/Ff"] = flags
    d["/DA"] = pikepdf.String(f"/Helv {font_size} Tf 0 g")
    d["/V"] = pikepdf.String("")
    d["/F"] = 4
    d["/MK"] = pikepdf.Dictionary()
    return pdf.make_indirect(d)

def make_checkbox_field(pdf, name, page, rect):
    d = pikepdf.Dictionary()
    d["/Type"] = pikepdf.Name("/Annot")
    d["/Subtype"] = pikepdf.Name("/Widget")
    d["/FT"] = pikepdf.Name("/Btn")
    d["/T"] = pikepdf.String(name)
    d["/Rect"] = pikepdf.Array([rect[0], rect[1], rect[2], rect[3]])
    d["/P"] = page.obj
    d["/V"] = pikepdf.Name("/Off")
    d["/AS"] = pikepdf.Name("/Off")
    d["/DA"] = pikepdf.String("/ZaDb 0 Tf 0 g")
    d["/F"] = 4
    mk = pikepdf.Dictionary()
    mk["/CA"] = pikepdf.String("4")
    d["/MK"] = mk
    return pdf.make_indirect(d)

def main():
    pdf = pikepdf.open(INPUT, allow_overwriting_input=True)
    page1 = pdf.pages[0]
    page2 = pdf.pages[1]
    
    fields = []
    
    # PAGE 1 FIELDS (612 x 792 US Letter)
    fields.append(make_text_field(pdf, "District", page1, [200, 700, 460, 716]))
    fields.append(make_text_field(pdf, "Case Number", page1, [410, 680, 570, 696]))
    fields.append(make_text_field(pdf, "Debtor 1", page1, [72, 678, 350, 694]))
    fields.append(make_text_field(pdf, "Chapter", page1, [410, 664, 570, 678]))
    
    # Section 1: Compensation amounts
    fields.append(make_text_field(pdf, "agreed_compensation", page1, [484, 570, 572, 586]))
    fields.append(make_text_field(pdf, "prior_received", page1, [484, 554, 572, 570]))
    fields.append(make_text_field(pdf, "balance_due", page1, [484, 536, 572, 552]))
    
    # Section 2: Source paid
    fields.append(make_checkbox_field(pdf, "source_paid_debtor", page1, [72, 496, 86, 510]))
    fields.append(make_checkbox_field(pdf, "source_paid_other", page1, [148, 496, 162, 510]))
    fields.append(make_text_field(pdf, "source_paid_other_specify", page1, [250, 496, 540, 510]))
    
    # Section 3: Source to be paid
    fields.append(make_checkbox_field(pdf, "source_topay_debtor", page1, [72, 464, 86, 478]))
    fields.append(make_checkbox_field(pdf, "source_topay_other", page1, [148, 464, 162, 478]))
    fields.append(make_text_field(pdf, "source_topay_other_specify", page1, [250, 464, 540, 478]))
    
    # Section 4: Fee sharing
    fields.append(make_checkbox_field(pdf, "no_fee_sharing", page1, [72, 422, 86, 436]))
    fields.append(make_checkbox_field(pdf, "fee_sharing", page1, [72, 394, 86, 408]))
    
    # Section 5: Services
    fields.append(make_checkbox_field(pdf, "service_a", page1, [56, 330, 70, 344]))
    fields.append(make_checkbox_field(pdf, "service_b", page1, [56, 304, 70, 318]))
    fields.append(make_checkbox_field(pdf, "service_c", page1, [56, 282, 70, 296]))
    
    # PAGE 2 FIELDS
    fields.append(make_checkbox_field(pdf, "service_d", page2, [56, 714, 70, 728]))
    fields.append(make_text_field(pdf, "other_services", page2, [56, 608, 540, 700], multiline=True))
    fields.append(make_text_field(pdf, "excluded_services", page2, [56, 448, 540, 560], multiline=True))
    
    # Certification
    fields.append(make_text_field(pdf, "date_signed", page2, [56, 340, 200, 356]))
    fields.append(make_text_field(pdf, "attorney_signature", page2, [280, 340, 560, 356]))
    fields.append(make_text_field(pdf, "law_firm_name", page2, [280, 310, 560, 326]))
    
    # Add annotations to pages
    p1_annots = pikepdf.Array()
    p2_annots = pikepdf.Array()
    for f in fields:
        try:
            p_ref = f.get("/P")
            if p_ref.is_indirect and p_ref.objgen == page1.obj.objgen:
                p1_annots.append(f)
            else:
                p2_annots.append(f)
        except:
            p2_annots.append(f)
    
    page1["/Annots"] = p1_annots
    page2["/Annots"] = p2_annots
    
    # Create AcroForm
    acro = pikepdf.Dictionary()
    acro["/Fields"] = pikepdf.Array(fields)
    
    helv = pikepdf.Dictionary()
    helv["/Type"] = pikepdf.Name("/Font")
    helv["/Subtype"] = pikepdf.Name("/Type1")
    helv["/BaseFont"] = pikepdf.Name("/Helvetica")
    
    zadb = pikepdf.Dictionary()
    zadb["/Type"] = pikepdf.Name("/Font")
    zadb["/Subtype"] = pikepdf.Name("/Type1")
    zadb["/BaseFont"] = pikepdf.Name("/ZapfDingbats")
    
    fonts = pikepdf.Dictionary()
    fonts["/Helv"] = helv
    fonts["/ZaDb"] = zadb
    
    dr = pikepdf.Dictionary()
    dr["/Font"] = fonts
    
    acro["/DR"] = dr
    acro["/DA"] = pikepdf.String("/Helv 10 Tf 0 g")
    acro["/NeedAppearances"] = True
    
    pdf.Root["/AcroForm"] = pdf.make_indirect(acro)
    pdf.save(OUTPUT)
    print(f"Saved fillable PDF with {len(fields)} fields to {OUTPUT}")
    
    # Verify
    verify_pdf = pikepdf.open(OUTPUT)
    vac = verify_pdf.Root.get("/AcroForm")
    if vac:
        vfields = vac.get("/Fields", [])
        print(f"Verified: AcroForm has {len(vfields)} fields")
        for f in vfields:
            fname = str(f.get("/T", "(unnamed)"))
            ft = str(f.get("/FT", ""))
            print(f"  - {fname} ({ft})")
    else:
        print("ERROR: No AcroForm found!")

if __name__ == "__main__":
    main()
