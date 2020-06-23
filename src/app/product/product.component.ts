import { Component, OnInit, Input, EventEmitter, Output } from '@angular/core';
import { Product, World } from '../world';
import { RestserviceService } from '../restservice.service';

@Component({
  selector: 'app-product',
  templateUrl: './product.component.html',
  styleUrls: ['./product.component.css']
})
export class ProductComponent implements OnInit {

  product: Product;
  progressbarvalue: number = 0;
  lastupdate: number = Date.now();
  world: World = new World();
  progressbar : any;
  qteMaxCanBuy: number = 0;
  private service: RestserviceService;

  private _server: string;
  private _qtmulti: string;
  private _money: number;

  constructor() { }

  ngOnInit(): void {
    setInterval(() => { this.calcScore(); }, 100);
  }

  @Input() 
  set qtmulti(value: string) { 
    this._qtmulti = value; 
    if (this._qtmulti && this.product) this.calcMaxCanBuy(); 

    if (this._qtmulti == "Max") {
      this.qteMaxCanBuy = this.calcMaxCanBuy()
    }else{
      this.qteMaxCanBuy = 0
    }
  } 

  @Input() 
  set money(value: number) { 
    this._money = value; 
  }

  @Input()
  set prod(value: Product) {
    this.product = value;
    if (this.product && this.product.timeleft > 0) {
      this.lastupdate = Date.now();
      let progress = ((this.product.vitesse - this.product.timeleft) / this.product.vitesse) * 100;
      console.log(progress)
     
      this.progressbar.set(progress);
      this.progressbar.animate(1, { duration: this.product.timeleft });
    }
  }

  @Input()
  set server(value: string) {
    this._server = value;
  }

  @Output() 
  notifyProduction: EventEmitter<Product> = new EventEmitter<Product>();
  
  @Output() 
  notifyBuy: EventEmitter<Number> = new EventEmitter<Number>();
  
  get server(): string {
    return this._server;
  }

  calcMaxCanBuy(): number {
    var qte = Math.log(1-(this._money/this.product.cout*(1-this.product.croissance)))/Math.log(this.product.croissance);
    return Math.floor(qte);
  }

  calcScore() {
   // console.log(" derniere mise à jour "+this.lastupdate)
   // console.log(" temps restant pour la prod "+this.product.timeleft)
    if(!(this.product.timeleft == 0)) 
    {
      console.log(" derniere mise à jour on prod "+this.lastupdate)
      console.log(" maintenant "+Date.now())
      var tempsEcoule = Date.now() - this.lastupdate;
      console.log(" tempsEcoule "+tempsEcoule)
     
      if(this.product.timeleft <= 0) 
      {
        this.product.timeleft = 0;
        this.progressbarvalue = 0;
        this.notifyProduction.emit(this.product);
        if(this.product.managerUnlocked) 
        {
          this.startProduction()
        }
      }
      else {
        this.product.timeleft -= tempsEcoule;
        console.log(this.product.timeleft)
        this.progressbarvalue = ((this.product.vitesse - this.product.timeleft) / this.product.vitesse) * 100;
      }
    } 
    else {
      if(this.product.managerUnlocked){
        this.startProduction();
      }
    }

    // on prévient le composant parent que ce produit a généré son revenu.
    //this.notifyProduction.emit(this.product);

  }

  canBuy(): boolean {
    switch(this._qtmulti){
      case "x1":
      case "Max":
        return this.calcMaxCanBuy() >= 1;
      case "x10": 
        return this.calcMaxCanBuy() >= 10;
      case "x100": 
        return this.calcMaxCanBuy() >= 100;
    }
  }

  calcCout(qte: number): number{
    return this.product.cout*(1-Math.pow(this.product.croissance, qte))/(1-this.product.croissance);
  }

  buy(): void {
    switch(this._qtmulti){
      case "x1":
        this.product.quantite += 1;
        this.notifyBuy.emit(this.calcCout(1));
        this.product.cout = this.product.cout * this.product.croissance;
        break;
      case "x10": 
        this.product.quantite += 10;
        this.notifyBuy.emit(this.calcCout(10));
        this.product.cout = this.product.cout * Math.pow(this.product.croissance, 10);
        break;
      case "x100": 
        this.product.quantite += 100;
        this.notifyBuy.emit(this.calcCout(100));
        this.product.cout = this.product.cout * Math.pow(this.product.croissance, 100);
        break;
      case "Max":
          this.product.quantite += this.calcMaxCanBuy();
          this.notifyBuy.emit(this.calcCout(this.calcMaxCanBuy()));
          this.product.cout = this.product.cout * Math.pow(this.product.croissance, this.calcMaxCanBuy());
        break;
    }
     this.service.putProduct(this.product);
  }

  startProduction(){
    if(this.product.quantite > 0){
      this.product.timeleft = this.product.vitesse;
    }
  }

}
