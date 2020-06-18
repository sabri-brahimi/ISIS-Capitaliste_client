import { Component, HostListener, ViewChildren, QueryList } from '@angular/core';
import { RestserviceService } from './restservice.service';
import { World, Product, Pallier } from './world';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ProductComponent } from './product/product.component';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {

  title = 'ISIS-capitalist';
  world: World = new World();
  server: string;
  username : string;

  qtmulti: string;
  qtmulti_value: string[] = ["x1", "x10", "x100", "Max"];
  qtmulti_pos: number = 0;

  showManagers: boolean = false;
  showUnlocks: boolean = false;
  showUpgrade: boolean = false;
  badgeManagers: number = 0;

  @ViewChildren(ProductComponent) productComponents: QueryList<
    ProductComponent
  >;
  
  constructor(private service: RestserviceService, private snackbar: MatSnackBar) {
    this.server = service.getServerImage();
    service.getWorld().then(
    world => {
    this.world = world;
    });

    this.username = localStorage.getItem('username');
    if (this.username == null) {
      this.username = Math.floor(Math.random() * 1000000000).toString();
      localStorage.setItem('username', this.username);
    }
    this.onUsernameChanged();
  }

  ngOnInit(): void {
    this.qtmulti = this.qtmulti_value[this.qtmulti_pos];
  }

  onProductionDone(product: Product){
    this.world.score += product.revenu * product.quantite;
    this.world.money += product.revenu * product.quantite;
    this.calcBadgeManager();
  }

  onBuyDone(cout: number){
    // this.world.score += product.cout * product.quantite;
    this.world.money -= cout;
    this.calcBadgeManager();
  }

  calcBadgeManager(): void{
    this.badgeManagers = this.world.managers.pallier.filter(p => p.seuil <= this.world.money && p.unlocked == false).length;
  }
  
  qtmultiClick(){
    this.qtmulti_pos++;
    if(this.qtmulti_pos == this.qtmulti_value.length){
      this.qtmulti_pos = 0;
    }
    this.qtmulti = this.qtmulti_value[this.qtmulti_pos];
  }

  hireManager(manager : Pallier){
    if(manager.seuil <= this.world.money){
      this.world.money -= manager.seuil;
      manager.unlocked = true;
      this.world.products.product[manager.idcible-1].managerUnlocked = true;
      this.popMessage(manager.name + " a été engagé !")
    }
  }

  popMessage(message : string) : void {
    this.snackbar.open(message, "", { duration : 2000 })
  }

  onUsernameChanged(): void {
    this.service.user = this.username;
  }

  nextUnlocks(product?: Product): Pallier {
    let pallier: Pallier[];
    if (product == null) {
      pallier = this.world.allunlocks.pallier;
    } else {
      pallier = product.palliers.pallier;
    }
    for (let i = 0; i < pallier.length - 1; i++) {
      if (!pallier[i].unlocked) {
        return pallier[i];
      }
    }
    return null;
  }

  buyUpgrade(upgrade: Pallier): void {
    if (this.world.money < upgrade.seuil) {
      return;
    }

    this.service
      .putUpgrade(upgrade)
      .then(() => {
        upgrade.unlocked = true;
        let products: Product[];
        if (upgrade.idcible > 0) {
          this.productComponents.forEach((p) => {
            if (p.product.id == upgrade.idcible) products = [p.product];
          });
        } else if (upgrade.idcible == 0){
          products = [];
          this.productComponents.forEach((p) => {
            products.push(p.product);
          });
        }
        switch (upgrade.typeratio) {
          case 'gain':
            for (let p of products) {
              p.revenu = p.revenu * upgrade.ratio;
            }
            break;
          case 'vitesse':
            for (let p of products) {
              p.vitesse = p.vitesse / upgrade.ratio;
              p.timeleft = p.timeleft / p.timeleft;
            }
            break;
          case 'ange':
            break;
        }
        this.world.money -= upgrade.seuil;
      })
      .catch(() => {
        this.snackbar.open('An error as occured', '', {
          duration: 4000,
        });
      });
  }
}
