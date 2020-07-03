import { Component, OnInit, Input, EventEmitter, Output } from '@angular/core';
import { Product, Pallier } from '../world';
import { MatSnackBar } from '@angular/material/snack-bar';
import { RestserviceService } from '../restservice.service';

@Component({
  selector: 'app-product',
  templateUrl: './product.component.html',
  styleUrls: ['./product.component.css']
})
export class ProductComponent implements OnInit {

  private __product: Product;
  private __qtmulti: number;
  private __money: number;
  private __server: string;
  private __activeAngels: number;
  private __angelBonus: number;
  private __serverImg: string;

  progressbarvalue = 0;
  lastupdate: number;

  constructor(private service: RestserviceService, private snackbar: MatSnackBar) { }

  ngOnInit(): void {
    setInterval(() => {
      this.calcScore();
      this.calcCanBuy();
    }, 100);
  }

  @Input()
  set product(value: Product) {
    this.__product = value;
    this.lastupdate = Date.now();
  }

  get product(): Product {
    return this.__product;
  }

  @Input() 
  set qtmulti(value: number) {
    this.__qtmulti = value;
    if (this.__qtmulti && this.__product) this.calcMaxCanBuy();
  }

  get qtmulti(): number {
    return this.__qtmulti;
  }

  @Input() 
  set money(value: number) { 
    this.__money = value; 
  }

  @Input()
  set server(value: string) {
    this.__server = value;
  }

  get server(): string {
    return this.__server;
  }

  @Input()
  set serverImg(value: string) {
    this.__serverImg = value;
  }

  get serverImg(): string {
    return this.__serverImg;
  }

  @Input()
  set activeAngels(value: number) {
    this.__activeAngels = value
  }

  get activeAngels(): number {
    return this.__activeAngels;
  }

  @Input()
  set angelBonus(value: number) {
    this.__angelBonus = value
  }

  get angelBonus(): number {
    return this.__angelBonus
  }

  @Input()
  set managerUnlocked(value: boolean) {
    if (value) this.product.managerUnlocked = value;
  }

  @Output() startProduction: EventEmitter<Product> = new EventEmitter<Product>();

  @Output() notifyProduction: EventEmitter<Product> = new EventEmitter<Product>();
  
  startFabrication(): void {
    if (this.__product.timeleft > 0 || this.__product.quantite == 0) {
      return;
    }
    this.__product.timeleft = this.__product.vitesse;
    this.lastupdate = Date.now();
    if (!this.__product.managerUnlocked) {
      this.startProduction.emit(this.__product);
    }
  }

  calcScore() {
    if (this.__product.timeleft > 0) {
      this.__product.timeleft =
        this.__product.timeleft - (Date.now() - this.lastupdate);
      this.lastupdate = Date.now();
      if (this.__product.timeleft <= 0) {
        if (this.__product.managerUnlocked) {
          this.startFabrication();
        } else {
          this.__product.timeleft = 0;
          this.progressbarvalue = 0;
        }
        this.notifyProduction.emit(this.__product);
      } else {
        this.progressbarvalue =
          ((this.__product.vitesse - this.__product.timeleft) /
            this.__product.vitesse) *
          100;
      }
    } else if (this.__product.managerUnlocked) {
      this.startFabrication();
    }
    
  }

  calcCanBuy(): number {
    let max = this.calcMaxCanBuy();
    if (this.__qtmulti != 0) {
      if (max >= this.__qtmulti) {
        return this.__qtmulti;
      }
    } else {
      if (max >= 1) {
        return max;
      }
    }
    return 0;
  }

  buy(): void {
    let prix: number;
    switch (this.__qtmulti) {
      case 1:
        prix = this.__product.cout;
        this.__product.quantite += 1;
        this.__product.cout = this.__product.cout * this.__product.croissance;
        break;
      case 10:
        prix = this.getPrix(10);
        this.__product.quantite += 10;
        this.__product.cout = this.__product.cout * this.__product.croissance ** 10;
        break;
      case 100:
        prix = this.getPrix(100);
        this.__product.quantite += 100;
        this.__product.cout = this.__product.cout * this.__product.croissance ** 100;
        break;
      case 0:
        let qtt = this.calcMaxCanBuy();
        prix = this.getPrix(qtt);
        this.__product.quantite += qtt;
        this.__product.cout = this.__product.cout * this.__product.croissance ** qtt;
        break;
    }
    //this.onBuy.emit({ amount: prix, p: this.__product });

    this.service.putProduct(this.__product).then(response => {
      console.log(response)
    })

    this.__product.palliers.pallier.forEach((p) => {
      if (!p.unlocked && p.seuil<=this.__product.quantite) {
        this.calcUpgrade(p);
        this.snackbar.open(
          'You just unlocked the ' + this.__product.name + ' upgrade ' + p.name,
          '',
          {
            duration: 4000,
          }
        );
      }
    });
  }

  calcMaxCanBuy(): number {
    return Math.floor(
      Math.log(
        -(
          this.__money / this.__product.cout -
          1 / (1 - this.__product.croissance)
        ) *
          (1 - this.__product.croissance)
      ) / Math.log(this.__product.croissance)
    );
  }

  getPrix(quantite: number) {
    return (
      (this.__product.cout * (1 - this.__product.croissance ** quantite)) /
      (1 - this.__product.croissance)
    );
  }

  calcUpgrade(p: Pallier): void {
    // Si le seuil du pallier est dépassé, on met à jour le produit
    if (p.seuil <= this.__product.quantite) {
      switch (p.typeratio) {
        case 'vitesse':
          this.__product.vitesse = this.__product.vitesse / p.ratio;
          this.__product.timeleft = this.__product.timeleft / p.ratio;
          break;
        case 'gain':
          this.__product.revenu = this.__product.revenu * p.ratio;
          break;
      }
      p.unlocked = true;
    }
  }

  


}
