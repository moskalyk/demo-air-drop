import React from 'react';
import logo from './logo.svg';
import './App.css';
import button from './button.png'
import { sequence } from '0xsequence'
import { 
  Box, 
  IconButton, 
  SunIcon, 
  MoonIcon,
  Spinner,
  useTheme } from '@0xsequence/design-system'

// import Splitting from "https://cdn.skypack.dev/splitting";

import { SequenceIndexerClient } from '@0xsequence/indexer'

const indexer = new SequenceIndexerClient('https://polygon-indexer.sequence.app')

let themeColor: any;
let centerVec: any;
let mouseVec: any;
let total = 0;
let initialForce = 2
let friction = .8
let springForce = 1
let k = 0.1
let mouseThreshold = 40
let mouseRepelForce = 0.1
let forceToCenter = 0.008
let minDist = 25;
let minDistSQ = minDist * minDist;
let particles: any = [];
let count = 0
let instructionVisible = false
let reset = false;

function getInverseColor(color: any) {
  // Convert HSL color values to RGB
  const { h, s, l } = color;
  const rgbColor = hslToRgb(h, s, l);

  // Calculate the inverse color
  const inverseRgb = rgbColor.map((value) => 255 - value);

  // Convert inverse RGB color to HSL
  const inverseHsl = rgbToHsl(inverseRgb[0],inverseRgb[1],inverseRgb[2]);

  // Return the inverse color as an object {h, s, l}
  return {
    h: inverseHsl[0],
    s: inverseHsl[1],
    l: inverseHsl[2],
  };
}

// Helper function to convert HSL to RGB
function hslToRgb(h: any, s: any, l: any) {
  h /= 360;
  s /= 100;
  l /= 100;

  let r, g, b;

  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p: any, q: any, t: any) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;

    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }

  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

// Helper function to convert RGB to HSL
function rgbToHsl(r: any, g: any, b: any) {
  r /= 255;
  g /= 255;
  b /= 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h: any, s, l;

  l = (max + min) / 2;

  if (max === min) {
    h = s = 0; // achromatic
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }

    h /= 6;
  }

  return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)];
}

function init() {
  centerVec = new Vector(window.innerWidth / 2, window.innerHeight / 2 );
  mouseVec = new Vector();

  window.addEventListener("mousemove", inputMove);
  window.addEventListener("touchmove", inputMove, {passive:false})
  window.addEventListener("resize", resize)
  
  update();
}

function inputMove(e: any){
  if(e.type == "touchmove")
    e.preventDefault();

  var x, y
  if(e.type.indexOf("mouse") >= 0){
    x = e.clientX;
    y = e.clientY;
  }else{
    x = e.changedTouches[0].clientX
    y = e.changedTouches[0].clientY
  }
  
  mouseVec.x = x
  mouseVec.y = y
}

function resize(){
  centerVec.x = window.innerWidth / 2
  centerVec.y = window.innerHeight / 2
}

const colors = [{
  h: 302,
  s: 71,
  l: 34
},{
  h: 242,
  s: 54,
  l: 45
},{
  h: 183,
  s: 69,
  l: 41
},{
  h: 302,
  s: 83,
  l: 47
},{
  h: 242,
  s: 90,
  l: 62
},{
  h: 184,
  s: 88,
  l: 60
},]
function create(){
  const chosenColor = colors[Math.floor(Math.random() * (colors.length - 1))]
  let color;

  if(themeColor == 'light'){
    color = getInverseColor({
      h: chosenColor.h,
      s: chosenColor.s,
      l: chosenColor.l
    });
  } else {
    color = {
      h: chosenColor.h,
      s: chosenColor.s,
      l: chosenColor.l
    }
  }


  const colorStr = `hsl(${color.h}deg, ${color.s}%, ${color.l}%)`;
  
  const particle = new Particle(
    colorStr,
    centerVec.x,
    centerVec.y,
    friction
  )
  
  particle.velocity.x = Math.random()*initialForce-initialForce*0.5
  particle.velocity.y = Math.random()*initialForce-initialForce*0.5
  
  particles.push(particle);
  count = particles.length
}

function update() {
  requestAnimationFrame(update);
  if(reset){
    for(let i = 0; i < count; i++){
      particles[i].delete()
    }
    particles = []
    reset = false
    count = 0
  }

  if(count < total){
    create()
  }
  
  for(let i = 0; i < count; i++){
    particles[i].update()
    repelToMouse(particles[i])
    if (count == total){
      attactToCenter(particles[i])
      if (!instructionVisible){
        instructionVisible = true
        // document.querySelector("h4")!.style.display = "block"
      }
    }
  }
  
//   for(let i = 0; i < count-1; i++){
//     const particleA = particles[i]
    
//     for(let j = i + 1; j < count; j++){
//       const particleB = particles[j]
//       //repel(particleA, particleB)
//     }
//   }
  
  for(let i = 0; i < count; i++){
    const particleA = particles[i]
    
    for(let j = 0; j < count; j++){
      const particleB = particles[j]
      repel2(particleA, particleB)
    }
  }
  
}

function repel(particleA: any, particleB: any){
  const force = Vector.sub(particleB.position, particleA.position)
  const dist = force.mag()

  if(dist < minDist){
    const x = dist - minDist;
    force.normalize()
    force.mult(-1 * k * x)
    
    particleA.velocity.sub(force)
    particleB.velocity.add(force)
  }
}

// from generative-design book: 
// https://editor.p5js.org/generative-design/sketches/M_6_1_03
function repel2(particleA: any, particleB: any){
  const force = Vector.sub(particleA.position, particleB.position)
  const dist = force.mag()

  if(dist > 0 && dist < minDist){
    const ramp = 0.5
    const strength = -5
    const s = Math.pow( dist / minDist, 1 / ramp);
    const f = s * 9 * strength * (1 / (s + 1) + ((s-3) / 4)) / dist
    force.mult(f)
    
    particleA.velocity.sub(force)
  }
}

function repelToMouse(particle: any){
  
  const force = Vector.sub(mouseVec, particle.position)
  const dist = force.mag()
  if (dist < mouseThreshold){
    const x = dist - mouseThreshold;
    //force.normalize()
    force.mult(-1 * k * x)
    force.mult(mouseRepelForce)

    particle.velocity.sub(force)
  }
}

function attactToCenter(particle: any){
  const force = Vector.sub(centerVec, particle.position)
  const dist = force.mag()
  
  if (dist > minDist){
    const x = dist - minDist;
    force.normalize()
    force.mult(-1 * k * x)
    force.mult(forceToCenter)
    
    particle.velocity.sub(force)
  }
}

class Vector{
  x
  y
  constructor(x = 0, y = 0){
    this.x = x
    this.y = y
    
    return this
  }
  
  add(v: any){
    this.x += v.x
    this.y += v.y
    return this
  }
  
  sub(v: any){
    this.x -= v.x
    this.y -= v.y
    return this
  }
  
  mult(n: any){
    this.x *= n
    this.y *= n
    return this
  }
  
  div(n: any){
    this.x /= n
    this.y /= n
    return this
  }
  
  magSQ(){
    return this.x * this.x + this.y * this.y
  }
  
  mag(){
    return Math.sqrt(this.magSQ())
  }
  
  normalize(){
    let m = this.mag()
    if (m != 0)
      this.div(m)
    
    return this
  }
  
  limit(n: any){
    let m = this.mag()
    if(m > n){
      this.normalize()
      this.mult(n)
    }
    
    return this
  }
  
  static add (v1: any, v2: any){
    return new Vector(v1.x, v1.y).add(v2)
  }
  
  static sub (v1: any, v2: any){
    return new Vector(v1.x, v1.y).sub(v2)
  }
  
  static mult (v1: any, n: any){
    return new Vector(v1.x, v1.y).mult(n)
  }
  
  static div (v1: any, n: any){
    return new Vector(v1.x, v1.y).div(n)
  }
}

class Particle {
  position
  velocity
  acceleration
  friction
  k
  el
  size
  sizeHalf
  constructor(color = "#000000", x = 0, y = 0, friction = 1) {
    this.position = new Vector(x, y)
    this.velocity = new Vector()
    this.acceleration = new Vector()
    this.friction = friction
    this.k = 0.1
    
    this.el = document.createElement("div");
    document.body.appendChild(this.el);
    this.el.className = "hexagon";

    this.el.style.backgroundColor = color;
    this.size = this.el.offsetWidth;
    this.sizeHalf = this.size / 2;

    this.update();
  }
  
  applyForce(forceVector: any){
    this.acceleration.add(forceVector)
  }
  delete(){
    this.el.className = "";
  }
  
  // attract(targetVector, intensity){
  //   const force = Vector.sub(targetVector, this.position)
  //   const d = force.mag()
  //   force.mult(intensity * Math.exp(-0.02 * d))
  //   this.applyForce(force)
  // }
  
//   springTo(targetVector, distMin, intensity){
//     const force = Vector.sub(targetVector, this.position)
//     const d = force.mag()
//     const x = d - distMin;
//     force.normalize()
//     force.mult(-1 * this.k * x)
//     force.mult(intensity)
    
//     this.applyForce(force)
    
//   }
  
//   repelTo(targetVector, distMin, intensity){
//     const force = Vector.sub(targetVector, this.position)
//     const d = force.mag()
    
//     if(d < distMin){  
//       const x = d - distMin;
//       force.normalize()
//       force.mult(-1 * this.k * x)
//       force.mult(intensity)

//       this.applyForce(force)
//     }
    
//   }

  update() {
    this.velocity.add(this.acceleration)
    this.velocity.mult(this.friction)
    this.position.add(this.velocity)
    
    this.acceleration.mult(0)
    
    this.el.style.transform = `translate(${this.position.x - this.sizeHalf}px, ${this.position.y - this.sizeHalf}px)`;
  }
}

const wait = async (ms: number) => {
  await new Promise((res) => setTimeout(res, ms))
}

const fullIndexerTxPagination = async (indexer: any, address: string) => {
  const txs: any = []

  // here we query the contract address, but you can use any
  const filter = {
      contractAddress: address,
  };

  // query Sequence Indexer for all token transaction history on Mumbai
  let txHistory = await indexer.getTransactionHistory({
      filter: filter,
      page: { pageSize: 100 }
  })

  
  txs.push(...txHistory.transactions)

  // if there are more transactions to log, proceed to paginate
  while(txHistory.page.more){  
      await wait(2000)
      txHistory = await indexer.getTransactionHistory({
          filter: filter,
          page: { 
              pageSize: 100, 
              // use the after cursor from the previous indexer call
              after: txHistory!.page!.after! 
          }
      })
      txs.push(...txHistory.transactions)
  }

  return txs
}

function App() {
  const [initialized, setInitialized] = React.useState(false)
  const [run, setRun] = React.useState(false)
  const [earned, setEarned] = React.useState(false)
  const [transferAmount, setTransferAmount] = React.useState<any>(null)
  const [balance, setBalance] = React.useState<any>(null)
  const [loggedIn, setLoggedIn] = React.useState<any>(false)
  const [color, setColor] = React.useState<any>('black')
  const [address, setAddress] = React.useState<any>(null)
  const [ethAuthProofString, setEthAuthProofString] = React.useState<any>(null)
  const [collecting, setCollecting] = React.useState(false)
  const [owners, setOwners] = React.useState<any>(null)
  const {theme, setTheme} = useTheme()

  const airdrop = async () => {
    setCollecting(true)
    const res = await fetch("http://155.138.132.208:4000/transaction", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({ 
        address: address,
        ethAuthProofString: ethAuthProofString
      }),
    })
    setCollecting(false)
  }

  const bootstrap = async () => {
      await airdrop()
      const amount = await getLastTx()
      init()
      setTimeout(() => {
        setEarned(true)
      }, amount*10)
      setInitialized(true)
  }
  React.useEffect(() => {
    themeColor = theme
    if(loggedIn) getBalance()
    if(run && !initialized){
      bootstrap()
    }
  },[run, earned, balance, loggedIn])

  const collect = () => {
    setRun(true)
    reset = true;
    total = 0
    setTransferAmount(null)
    setEarned(false)
    setInitialized(false)
  }
  const getBalance = async () => {
    // try any account address you'd like :)
    const accountAddress = address

    // query Sequence Indexer for all token balances of the account on Polygon
    const tokenBalances = await indexer.getTokenBalances({
        accountAddress: accountAddress,
        includeMetadata: true
    })
    // console.log('tokens in your account:', tokenBalances)
    setBalance(0)
    tokenBalances.balances.map((balance: any ) => {
      if(balance.contractAddress == '0xdd0d8fee45c2d1ad1d39efcb494c8a1db4fde5b7')
        setBalance(balance.balance)
    })
  }

  const getNumOwners  = async () => {
      // try any account address you'd like :)
      const txHistory = await fullIndexerTxPagination(indexer, '0xdd0d8fee45c2d1ad1d39efcb494c8a1db4fde5b7')

      console.log('transaction history in account:', txHistory)
      const owners: any = {}
      txHistory.map((tx: any) => {
        console.log(tx)
        tx.transfers.map((transfer: any) => {
          owners[transfer.to] = true
        })
      })

      setOwners( Object.keys(owners).length)
  }

  const getLastTx = async () => {
    // try any account address you'd like :)
    const filter = {
      accountAddress: address
    }

    // query Sequence Indexer for all token transaction history on Polygon
    const transactionHistory = await indexer.getTransactionHistory({
      filter: filter,
      includeMetadata: true
    })
      
    console.log('transaction history in account:', transactionHistory)
    let amount = 0;
    let first = false
    transactionHistory.transactions.map((tx: any) => {
      tx.transfers.map((transfer: any) => {
        if( !first && transfer.transferType == 'RECEIVE' && transfer.contractAddress == "0xdd0d8fee45c2d1ad1d39efcb494c8a1db4fde5b7"){
          setTransferAmount(transfer.amounts)
          total = Number(transfer.amounts)
          amount = total
          console.log("AMOUNT: ", amount)
          first = true
        }
      })
    })

    return amount
  }

  function alternateColors(divId: any, colorList: any) {
    var div = document.getElementById(divId);
    var text = div!.innerHTML;
    var coloredText = "";
    var numColors = colorList.length;
    var colorIndex = 0;
  
    for (var i = 0; i < text.length; i++) {
      if (text[i] === " ") {
        coloredText += " ";
      } else {
        coloredText += '<span style="color: ' + colorList[colorIndex] + ';">' + text[i] + '</span>';
        colorIndex = (colorIndex + 1) % numColors;
      }
    }
  
    div!.innerHTML = coloredText;
  }
  // setTheme('dark')

  React.useEffect(() => {
    let color;
    const chosenColor = colors[Math.floor(Math.random() * (colors.length - 1))]
    if(theme == 'light'){
      color = getInverseColor({
        h: chosenColor.h,
        s: chosenColor.s,
        l: chosenColor.l
      });
    } else {
      color = {
        h: chosenColor.h,
        s: chosenColor.s,
        l: chosenColor.l
      }
    }
    const colorStr = `hsl(${color.h}deg, ${color.s}%, ${color.l}%)`;
    setColor(colorStr)
    // alternateColors("ten", colors);
  }, [theme, color])

  const login = async () => {

    const wallet = sequence.getWallet()
    const connectWallet = await wallet.connect({
      networkId: 137,
      app: 'Flore',
      authorize: true,
      settings: {
        theme: 'dark'
      }
    })

    if(connectWallet.connected) {
      setLoggedIn(true)
      setAddress(connectWallet.session!.accountAddress!)
      setEthAuthProofString(connectWallet.proof!.proofString)
    }
  }
  themeColor = theme
  React.useEffect(()=> {
    getNumOwners()
  }, [balance, transferAmount])

  sequence.initWallet('polygon')
  return (
    <div className="App">
      <Box gap='6'>
        <IconButton style={{position: 'fixed', top: '20px', right: '20px'}} icon={theme == 'light' ? SunIcon : MoonIcon } onClick={() => {
          setTheme(theme == 'dark' ? 'light' : 'dark')
        }}/>
      </Box>
      <Box gap='6'>
        <p style={{position: 'fixed', top: '20px', right: '100px', fontSize: '40px'}}>
          ⬡ {balance}
        </p>
      </Box>
      <br/>
      {
        loggedIn 
        ? 
          <>
            <div className='container'>
              <button onClick={() => collect()} style={{boxShadow: `4px 4px 0px 0px ${theme == 'dark' ? 'white' : 'black'}`}} className='collect'>{collecting ? <Spinner justifyContent='center'/> : "collect"}</button>
            </div>
            <br/>
            <br/>
            <p style={{ position: 'absolute', width: '100%', fontFamily: 'Caprasimo', fontSize: '100px', textAlign: 'center'}}>{transferAmount}</p>
          </> 
        : 
          <>
            <p style={{ position: 'relative', width: '100%', fontFamily: 'Caprasimo', fontSize: '100px', textAlign: 'center'}}>collect <span style={{color: color, fontFamily: 'Caprasimo', fontSize: '100px', }}>florecoin</span></p>
            <br/>
            <br/>
            <p style={{ position: 'relative', width: '100%', fontFamily: 'Caprasimo', fontSize: '40px', textAlign: 'center'}}>airdrop based on blocktimes & <br/> random onchain 0-4x multiplier</p>
            <br/>
            
            <br/>
            <p style={{ position: 'relative', width: '100%', fontFamily: 'Consolas, monaco, monospace', fontSize: '15px', textAlign: 'center'}}>blocksSinceLastMint / blocksPerToken + blocksSinceLastMint / blocksPerToken * randomValue</p>
            <br/>
            <br/>
            <br/>
            <div className='container'>
              <button onClick={() => login()} style={{boxShadow: `4px 4px 0px 0px ${theme == 'dark' ? 'white' : 'black'}`}} className='collect'>login</button>
            </div>
            <br/>
            <br/>
            <br/>
            <p style={{ position: 'relative', width: '100%', fontFamily: 'Caprasimo', fontSize: '40px', textAlign: 'center'}}># of <span style={{color: color, fontFamily: 'Caprasimo', fontSize: '40px', }}>collectors</span></p>
            <br/>
            <p style={{ position: 'relative', width: '100%', fontFamily: 'Caprasimo', fontSize: '40px', textAlign: 'center'}}><span style={{color: color, fontFamily: 'Caprasimo', fontSize: '40px', }}>{owners}</span></p>
            <br/>
          </>
      }
    </div>
  );
}

export default App;
