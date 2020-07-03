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
  serverImg: string;

  qtmulti: number = 1;
  qtmulti_value: string[] = ["x1", "x10", "x100", "Max"];
  qtmulti_pos: number = 0;

  showManagers: boolean = false;
  showUnlocks: boolean = false;
  showUpgrade: boolean = false;
  showAngel: boolean = false;
  showInvestors: boolean = false;

  badgeManagers: number = 0;
  badgeUpgrades: number = 0;
  badgeAngels: number = 0;

  @ViewChildren(ProductComponent) productComponents: QueryList<ProductComponent>;
  
  constructor(private service: RestserviceService, private snackbar: MatSnackBar) {
    
    this.server = service.server;
    this.serverImg = service.serverImg;
    
   
    if(this.username == null) {
      this.username = localStorage.getItem('username');
      if(this.username == null) {
        this.username = Math.floor(Math.random() * 1000000000).toString();
      }
      
      localStorage.setItem('username', this.username);
    }
    
    this.onUsernameChanged();

    service.getWorld().then((world) => {
      this.world = world;
      this.updateBadges();
    });
  }

 

  onStartProduction(p: Product): void {
    this.service.putProduct(p);
  }

  onProductionDone(product: Product){
    let prod = product.revenu * product.quantite;
    prod += prod * ((1 + this.world.activeangels * this.world.angelbonus) / 100);
    this.world.money += prod;
    this.world.score += prod;
    this.service.putProduct(product);
    this.updateBadges();
  }

  calcQtMulti(): void {
    switch (this.qtmulti) {
      case 1:
        this.qtmulti = 10;
        break;
      case 10:
        this.qtmulti = 100;
        break;
      case 100:
        this.qtmulti = 0;
        break;
      case 0:
        this.qtmulti = 1;
        break;
      default:
        this.qtmulti = 1;
    }
  }

  onBuy(obj: { amount: number; p: Product }): void {
    console.log("on achete "+ obj.amount)
    if (this.world.money >= obj.amount) {
      this.world.money -= obj.amount;
      this.service.putProduct(obj.p);

      let products = this.world.products.product;

      // On récupère la quantité minimale de produits
      let qttMini = products[0].quantite;
      for (let i = 1; i < products.length - 1; i++) {
        if (products[i].quantite < qttMini) {
          qttMini = products[i].quantite;
        }
      }
      for (let p of this.world.allunlocks.pallier) {
        if (p.seuil < qttMini && !p.unlocked) {
          this.productComponents.forEach((product) => product.calcUpgrade(p));
          this.snackbar.open('You just unlocked ' + p.name, '', {
            duration: 4000,
          });
        }
      }

      this.updateBadges();
      this.service.getWorld().then((world) => {
        console.log("monde mise à jour")
        this.world = world;
        this.updateBadges();
      })


    }
  }

  hireManager(manager : Pallier){
    if(manager.seuil <= this.world.money){
      this.world.money -= manager.seuil;
      manager.unlocked = true;
      this.world.products.product[manager.idcible-1].managerUnlocked = true;
      this.snackbar.open(manager.name + ' a rejoint votre équipe', '', {
        duration: 4000,
      });
      this.popMessage(manager.name + " a été engagé !")
    }
    this.service.putManager(manager).then((response) => {
      console.log("Manager acheté !")
    });

  }

  popMessage(message : string) : void {
    this.snackbar.open(message, "", { duration : 3000 })
  }

  onUsernameChanged(): void {
    this.service.user = this.username;
    localStorage.setItem('username', this.username);
  }

  togleManager(): void {
    this.showManagers;
    this.showUnlocks;
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

    this.service.putUpgrade(upgrade).then(() => {
      
      this.world.money -= upgrade.seuil;
      this.updatePallier(upgrade);
    });
  }

  buyAngel(): void {
    if (this.angelClaim < 1) return;

    this.service
      .deleteWorld()
      .then(() => {
        window.location.reload();
      })
      .catch(() => {
        this.snackbar.open('An error as occured', '', {
          duration: 4000,
        });
      });
  }

  buyAngelUpgrades(angelUpgrade: Pallier): void {
    if (this.world.activeangels < angelUpgrade.seuil) {
      return;
    }

    this.service.putAngelUpgrade(angelUpgrade).then(() => {
      this.world.activeangels -= angelUpgrade.seuil;
      this.updatePallier(angelUpgrade);
    });
  }

  get angelClaim(): number {
    let angels = Math.floor(
      150 * Math.sqrt(this.world.score / Math.pow(10, 15)) -
        this.world.totalangels
    );
    if (angels < 1) return 0;
    else return angels;
  }

  private updatePallier(pallier: Pallier): void {
    pallier.unlocked = true;
    let products: Product[];
    if (pallier.idcible > 0) {
      this.productComponents.forEach((p) => {
        if (p.product.id == pallier.idcible) products = [p.product];
      });
    } else if (pallier.idcible == 0) {
      products = [];
      this.productComponents.forEach((p) => {
        products.push(p.product);
      });
    }
    switch (pallier.typeratio) {
      case 'gain':
        for (let p of products) {
          p.revenu = p.revenu * pallier.ratio;
        }
        break;
      case 'vitesse':
        for (let p of products) {
          p.vitesse = p.vitesse / pallier.ratio;
          p.timeleft = p.timeleft / p.timeleft;
        }
        break;
      case 'ange':
        this.world.angelbonus += pallier.ratio;
        break;
    }

    this.service
    .putUpgrade(pallier)
    .then(() => {
      console.log("okay")
    })
    .catch(() => {
      this.snackbar.open('An error as occured', '', {
        duration: 4000,
      });
    });

  }

  private updateBadges(): void {
    this.badgeManagers = 0;
    for (let manager of this.world.managers.pallier) {
      if (manager.seuil <= this.world.money && !manager.unlocked)
        this.badgeManagers += 1;
    }
  
    this.badgeUpgrades = 0;
    for (let upgrade of this.world.upgrades.pallier) {
      if (upgrade.seuil <= this.world.money && !upgrade.unlocked)
        this.badgeUpgrades += 1;
    }
  
    this.badgeAngels = 0;
    for (let upgrade of this.world.angelupgrades.pallier) {
      if (upgrade.seuil <= this.world.activeangels && !upgrade.unlocked)
        this.badgeAngels += 1;
    }
  }
  

}
