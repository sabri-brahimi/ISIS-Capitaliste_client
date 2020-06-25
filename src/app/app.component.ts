import { Component, HostListener, ViewChildren, QueryList } from '@angular/core';
import { RestserviceService } from './restservice.service';
import { World, Product, Pallier } from './world';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ProductComponent } from './product/product.component';
import { log } from 'util';


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
  showAngel: boolean = false;
  showInvestors: boolean = false;

  badgeManagers: number = 0;
  badgeUpgrades: number = 0;
  badgeAngels: number = 0;

  @ViewChildren(ProductComponent) productComponents: QueryList<
    ProductComponent
  >;
  
  @HostListener('window:keydown.esc') onKeyDown() {
    this.showManagers = false;
    this.showUnlocks = false;
    this.showUpgrade = false;
    this.showAngel = false;
    this.showInvestors = false;
  }
  constructor(private service: RestserviceService, private snackbar: MatSnackBar) {
  
   // localStorage.removeItem('username');
    if (localStorage.getItem('username')) {
      this.username = localStorage.getItem('username');
    }
    this.onUsernameChanged();

    service.getWorld().then((world) => {
      this.world = world;
      this.updateBadges();
    });
  }

  ngOnInit(): void {
    this.qtmulti = this.qtmulti_value[this.qtmulti_pos];
  }

  onProductionDone(product: Product){
    let prod = product.revenu * product.quantite;
    prod += prod * ((1 + this.world.activeangels * this.world.angelbonus) / 100);
    this.world.money += prod;
    this.world.score += prod;
    this.updateBadges();
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
    if (this.username) {
      localStorage.setItem('username', this.username);
    }
    this.service.setUser(this.username);


    this.server = this.service.getServerImage();
    this.service.getWorld().then(
    world => {
      console.log(this.world)
    this.world = world;
    });
    
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
        switch (upgrade.typeratio.toLowerCase()) {
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
