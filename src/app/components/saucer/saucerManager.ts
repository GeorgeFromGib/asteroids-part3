import { PlayerShipManager } from './../player/playerShipManager';
import { GameOverState } from './../../gameStates/GameOverState';
import { SoundEffect } from './../../soundEffect';

import { Vector } from "p5";
import { ActorBase } from "../../shared/actors/base/actorBase";
import { ManagerBase } from "../../shared/managers/base/managerBase";
import { SaucerActor } from "./saucerActor";
import { AsteroidsGame } from "../../asteroidsGame";
import { GameTimer } from "../../gameTimer";
import { ISaucer, ISaucerTypeProfile } from "../../shared/interfaces/iConfig";



export enum SaucerTypes {
  LARGE = "SAUCER_LARGE",
  SMALL = "SAUCER_SMALL",
}

export class SaucerManager extends ManagerBase {
  saucerData: ISaucer;
  saucer: SaucerActor;
  firingTimer: GameTimer;
  firing: boolean = true;
  saucerEndXPos:number;
  saucerDirection:number;
  changeAngleTimer: GameTimer;
  saucerProfile: ISaucerTypeProfile;
  saucerSounds:Map<SaucerTypes,SoundEffect>
  saucerSound:SoundEffect;
  saucerExplosion: SoundEffect;


  public setup() {
    this.saucerData = this.gameEngine.configData.saucer;

    this.firingTimer = this.gameEngine.createTimer(
      this.saucerData.rateOfFire,
      () => {
        if(this.saucer)
          this.fireProjectile();
      }
    );
    this.changeAngleTimer=this.gameEngine.createTimer(1000,()=>{
      if(this.saucer)
        this.changeSaucerDirectionAngle()
    })
  }

  public loadSounds() {
    this.saucerSounds=new Map([
      [SaucerTypes.LARGE,this.gameEngine.soundEffects.get('saucerBig')],
      [SaucerTypes.SMALL,this.gameEngine.soundEffects.get('saucerSmall')],
    ]);
    this.saucerExplosion=this.gameEngine.soundEffects.get('bangMedium')
  }

  public update(timeDelta: number) {
    this._actors = [];

    if (this.saucer) {
      this._actors.push(this.saucer);

      if (this.firing && this.firingTimer.expired) this.firingTimer.restart();
      
      if (this.changeAngleTimer.expired && !this.saucer.changeDirType) this.changeAngleTimer.restart();

      if (this.saucer.collidedWith) {
        this.saucerExplosion.play();
        this.gameEngine.explosionsManager.createExplosion(this.saucer.position);
        this.clear();
      }

      if(this.saucer && this.isSaucerAtEnd())
        this.clear();
    }

    super.update(timeDelta);
  }

  public edgeWrap(actor:ActorBase) {
    this.wrapTopBottom(actor);
  }

  public clear() {
    this.saucerSound?.stop();
    this.saucer=undefined
  }

  public createSaucer(level:number) {
    if(this.saucer) return;
    const randomSaucer=this.getRandomSaucerType(level);
    this.saucerSound=this.saucerSounds.get(randomSaucer.type);
    if(!this.saucerSound.isPlaying())
      this.saucerSound.play(true);
    this.saucerProfile = this.getSaucerProfile(randomSaucer.type);
    this.saucerDirection=this.calcSaucerDirection();
    this.saucer = new SaucerActor(this.saucerData.model, this.saucerProfile,randomSaucer.dirChange);
    this.saucer.position=this.calcSaucerStartPos(this.saucer);
    this.saucer.velocity = new Vector().set(this.saucerDirection, 0).mult(this.saucerProfile.speed / 1000);
    this.saucerEndXPos=this.calcSaucerEndXpos(this.saucer.position,this.saucer.radius)
  }

  private getRandomSaucerType(level:number) :{type:SaucerTypes,dirChange:boolean}{
    const smallSaucerBias=Math.min(80,5*(level-1))
    const type= this.gameEngine.randomRange(0, 100) > (90-smallSaucerBias)
    ? SaucerTypes.SMALL
    : SaucerTypes.LARGE;
    const dirChange=this.gameEngine.randomRange(0, 100)>(90-smallSaucerBias)
    return {type,dirChange};
  }

  private changeSaucerDirectionAngle() {
    const possibleAngles=[1,-0.785,0.785]
    const rand=this.gameEngine.randomRange(0,100);
    let index=0;
    if(rand>50) index=1;
    if(rand>75) index=2;
    const newAngle= possibleAngles[index];
    this.saucer.velocity=new Vector().set(this.saucerDirection,0).rotate(newAngle).mult(this.saucerProfile.speed / 1000);
  }

  private calcSaucerEndXpos(position:Vector,radius:number) {
    const screen=this.gameEngine.screenSize;
    const xPos=position.x<0?screen.width+radius:-radius
    return xPos;
  }

  private calcSaucerDirection() {
    return this.gameEngine.randomRange(0, 100) > 50?1:-1
  }

  private getSaucerProfile(saucerType:string) {
    const sSize = this.saucerData.profiles.find(
      (s) => s.size == saucerType
    );
    return sSize;
  }

  private calcSaucerStartPos(saucer:ActorBase) {
    const screen=this.gameEngine.screenSize;
    const xPos =
      this.gameEngine.randomRange(0, 100) > 50
        ? screen.width + saucer.radius
        : -saucer.radius;
    const yPos = this.gameEngine.randomRange(
      40,
      screen.height - 40
    );
    
    return new Vector().set(xPos,yPos)
  }

  private isSaucerAtEnd() {
    const endX=this.saucerEndXPos;
    return ((this.saucer.velocity.x<0 && this.saucer.position.x<endX) || (this.saucer.velocity.x>0 && this.saucer.position.x>endX))
  }

  public fireProjectile() {
    this.gameEngine.projectilesManager.addSaucerProjectile(this.saucer,this.saucerData.projectileVel,this.saucerData.projectileLife)
  }
}