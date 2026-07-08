import { BadRequestException, Injectable } from '@nestjs/common';
import { Response } from 'express';
import { Parser } from 'json2csv';
import * as ExcelJS from 'exceljs';
import { InventoryService } from '../inventory/inventory.service';
import { FilterInventoryDto } from '../inventory/dto/filter-inventory.dto';

type ExportFilter = Omit<FilterInventoryDto, 'page' | 'limit'>;

@Injectable()
export class ExportService {
  constructor(private readonly inventoryService: InventoryService) {}

  async exportCSV(filter: ExportFilter, res: Response) {
    const items = await this.inventoryService.findForExport(filter);
    const fields = [
      { label: 'Item Code', value: 'itemCode' },
      { label: 'Item Name', value: 'itemName' },
      { label: 'Category', value: 'category' },
      { label: 'Purchase Date', value: (row: any) => row.purchaseDate?.toISOString().split('T')[0] ?? '' },
      { label: 'Quantity', value: 'quantity' },
      { label: 'Amount', value: (row: any) => row.amount?.toString() ?? '' },
      { label: 'Location', value: 'location' },
      { label: 'Status', value: 'status' },
      { label: 'Assigned User', value: (row: any) => row.assignedUser?.name ?? '' },
    ];
    const parser = new Parser({ fields });
    const csv = parser.parse(items);
    const date = new Date().toISOString().split('T')[0];
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=inventory-${date}.csv`);
    res.send(csv);
  }

  async exportXLSX(filter: ExportFilter, res: Response) {
    const items = await this.inventoryService.findForExport(filter);
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Inventory');

    sheet.columns = [
      { header: 'Item Code', key: 'itemCode', width: 16 },
      { header: 'Item Name', key: 'itemName', width: 30 },
      { header: 'Category', key: 'category', width: 20 },
      { header: 'Purchase Date', key: 'purchaseDate', width: 16 },
      { header: 'Quantity', key: 'quantity', width: 10 },
      { header: 'Amount', key: 'amount', width: 14 },
      { header: 'Location', key: 'location', width: 20 },
      { header: 'Status', key: 'status', width: 14 },
      { header: 'Assigned User', key: 'assignedUser', width: 24 },
    ];

    for (const item of items) {
      sheet.addRow({
        itemCode: item.itemCode,
        itemName: item.itemName,
        category: item.category,
        purchaseDate: item.purchaseDate?.toISOString().split('T')[0] ?? '',
        quantity: item.quantity,
        amount: item.amount?.toString() ?? '',
        location: item.location,
        status: item.status,
        assignedUser: (item as any).assignedUser?.name ?? '',
      });
    }

    const date = new Date().toISOString().split('T')[0];
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader('Content-Disposition', `attachment; filename=inventory-${date}.xlsx`);
    await workbook.xlsx.write(res);
    res.end();
  }

  rejectUnsupportedFormat() {
    throw new BadRequestException('Unsupported format. Use format=csv or format=xlsx');
  }
}
