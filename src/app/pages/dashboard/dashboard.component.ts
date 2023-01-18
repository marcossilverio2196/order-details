import {Component, OnInit} from '@angular/core';
import { map } from 'rxjs/operators';
import { Breakpoints, BreakpointObserver } from '@angular/cdk/layout';
import {OrderDetailService} from "../../services/order-detail.service";
import {MatTableDataSource} from "@angular/material/table";
import {OrderDetail} from "../../models/order-detail";
import { MAT_DATE_LOCALE, DateAdapter } from '@angular/material/core';
import {FormBuilder, FormControl, FormGroup} from "@angular/forms";

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'],
  providers: [
    {provide: MAT_DATE_LOCALE, useValue: 'en-US'}
  ]
})
export class DashboardComponent implements OnInit{

  formFilter:any;

  displayedColumns: string[] = ['purchase_date','invoice','customer_root','customer_leaf','product_description','pack_size','unit_type','category','distributor_root','distributor_leaf','manufacturer','quantity','price','total'];
  dataSource = new MatTableDataSource<any>();
  orderDetails: OrderDetail[] = [];


  //agrupar
  columns: any[];
  _alldata: any[];
  groupByColumns: string[] = [];

  constructor(private breakpointObserver: BreakpointObserver, private orderDetailService:OrderDetailService, private dateAdapter: DateAdapter<any>, public formBuilder:FormBuilder) {
    this.dateAdapter.setLocale('en-US');

    //agrupar
    this.columns = [{
      field: 'purchase_date'
    }, {
      field: 'invoice'
    }, {
      field: 'customer_root'
    }, {
      field: 'customer_leaf'
    }, {
      field: 'product_description'
    }, {
      field: 'pack_size'
    }, {
      field: 'unit_type'
    }, {
      field: 'category'
    }, {
      field: 'distributor_root'
    }, {
      field: 'manufacturer'
    }, {
      field: 'quantity'
    }, {
      field: 'price'
    }, {
      field: 'total'
    }];
    this.groupByColumns = ['brand'];
  }

  ngOnInit(): void {

    this.loadForm();

    this.orderDetailService.getOrderDetail().subscribe(
      data=>{
        this.orderDetails = data;
        this.dataSource = new MatTableDataSource<OrderDetail>(this.orderDetails);
      }
    );
  }
  get groupby() {
    return this.formFilter.get('groupby');
  }
  loadForm(){
    this.formFilter = new FormGroup({
      filterDate:new FormControl(),
      groupby: new FormControl(''),
    });
  }

  filterByDate(){
      let params={
        filterDate:this.dateToString(this.formFilter.get('filterDate').value)
      }
      this.orderDetailService.getOrderDetail(params).subscribe(
        data=>{
          this.orderDetails = data;
          this.dataSource = new MatTableDataSource<OrderDetail>(this.orderDetails);
        }
      );
  }

  onGroup(event) {
    let column = {
      field: this.formFilter.get('groupby').value
    }
    this.groupBy(event,column)
  }

  dateToString(d: Date) {
    try {
      //return ('00' +  d.getDate()).slice(-2) + '-' + ('00' +  (d.getMonth() + 1)).slice(-2) + '-' + d.getFullYear();
      return d.getFullYear() + '-' + ('00' +  (d.getMonth() + 1)).slice(-2) + '-' + ('00' +  d.getDate()).slice(-2);
    } catch (error) {
      return '';
    }
  }



  //agrupar
  groupBy(event, column) {
    event.stopPropagation();
    this.checkGroupByColumn(column.field, true);
    this.dataSource.data = this.addGroups(this._alldata, this.groupByColumns);
    this.dataSource.filter = performance.now().toString();
  }
  checkGroupByColumn(field, add ) {
    let found = null;
    for (const column of this.groupByColumns) {
      if (column === field) {
        found = this.groupByColumns.indexOf(column, 0);
      }
    }
    if (found != null && found >= 0) {
      if (!add) {
        this.groupByColumns.splice(found, 1);
      }
    } else {
      if ( add ) {
        this.groupByColumns.push(field);
      }
    }
  }
  unGroupBy(event, column) {
    event.stopPropagation();
    this.checkGroupByColumn(column.field, false);
    this.dataSource.data = this.addGroups(this._alldata, this.groupByColumns);
    this.dataSource.filter = performance.now().toString();
  }

  // below is for grid row grouping
  customFilterPredicate(data: any | Group, filter: string): boolean {
    return (data instanceof Group) ? data.visible : this.getDataRowVisible(data);
  }

  getDataRowVisible(data: any): boolean {
    const groupRows = this.dataSource.data.filter(
      row => {
        if (!(row instanceof Group)) {
          return false;
        }
        let match = true;
        this.groupByColumns.forEach(column => {
          if (!row[column] || !data[column] || row[column] !== data[column]) {
            match = false;
          }
        });
        return match;
      }
    );

    if (groupRows.length === 0) {
      return true;
    }
    const parent = groupRows[0] as Group;
    return parent.visible && parent.expanded;
  }

  groupHeaderClick(row) {
    row.expanded = !row.expanded;
    this.dataSource.filter = performance.now().toString();  // bug here need to fix
  }

  addGroups(data: any[], groupByColumns: string[]): any[] {
    const rootGroup = new Group();
    rootGroup.expanded = true;
    return this.getSublevel(data, 0, groupByColumns, rootGroup);
  }

  getSublevel(data: any[], level: number, groupByColumns: string[], parent: Group): any[] {
    if (level >= groupByColumns.length) {
      return data;
    }
    const groups = this.uniqueBy(
      data.map(
        row => {
          const result = new Group();
          result.level = level + 1;
          result.parent = parent;
          for (let i = 0; i <= level; i++) {
            result[groupByColumns[i]] = row[groupByColumns[i]];
          }
          return result;
        }
      ),
      JSON.stringify);

    const currentColumn = groupByColumns[level];
    let subGroups = [];
    groups.forEach(group => {
      const rowsInGroup = data.filter(row => group[currentColumn] === row[currentColumn]);
      group.totalCounts = rowsInGroup.length;
      const subGroup = this.getSublevel(rowsInGroup, level + 1, groupByColumns, group);
      subGroup.unshift(group);
      subGroups = subGroups.concat(subGroup);
    });
    return subGroups;
  }

  uniqueBy(a, key) {
    const seen = {};
    return a.filter((item) => {
      const k = key(item);
      return seen.hasOwnProperty(k) ? false : (seen[k] = true);
    });
  }

  isGroup(index, item): boolean {
    return item.level;
  }
}
export class Group {
  level = 0;
  parent: Group;
  expanded = true;
  totalCounts = 0;
  get visible(): boolean {
    return !this.parent || (this.parent.visible && this.parent.expanded);
  }
}