// Requirements.
const { app, BrowserWindow, ipcMain, Menu, nativeImage, Tray } = require('electron')
const { awGet, awRead, awWrite, awParseJSON } = require('./AwaitFuncs.js')
const { EventEmitter } = require('events')

function error(e) {
    console.error(e)
    return null
}

// TraySite Object to hold necessary data.
class TraySite extends EventEmitter {
    constructor(url) {
        super()

        // Define object properties.
        this.id     = Math.random().toString(36).substring(2)
        this.url    = url
        this.icon   = `https://www.google.com/s2/favicons?domain_url=${this.url}`
        this.window = null
        this.tray   = null
        this.ready  = false
        this.status = 0
    }

    exit() {
        if(this.window) this.window.close()
        if(this.tray)   this.tray.destroy()
        this.ready  = false
        this.window = null
        this.tray   = null
        this.status = -1
        this.emit('status', this.status)
    }

    stop() {
        if(this.window) this.window.close()
        this.window = null
    }

    async initialize() {
        // Build the tray and set appropriate events.
        if(!this.ready) {
            this.icon   = typeof this.icon !== "string" ? this.icon : nativeImage.createFromBuffer(await awGet(this.icon).catch(error))
            this.tray   = new Tray(this.icon)
            this.ready  = true

            // Build a menu for each item to use.
            const menu = Menu.buildFromTemplate([
                { label: "Stop", click: e => this.stop() },
                { type:  "separator" },
                { label: "Exit", click: e => this.exit() } 
            ])

            this.tray.setContextMenu(menu)

            // Tray Events
            this.tray.on('click', e => {
                // Check for and build the window incase it's been closed.
                if(!this.window) {
                    this.window = new BrowserWindow({ frame: false, show: false, webPreferences: { nodeIntegration: true } })
                    this.window.loadURL(this.url)
                    this.status = 0
                    this.emit('status', this.status)

                    // Window Events.
                    this.window.on('blur', e => {
                        this.window.hide()
                    })

                    this.window.on('closed', e => {
                        this.window = null
                        this.status = 0
                        this.emit('status', this.status)
                    })

                    this.window.on('ready-to-show', e => {
                        this.window.show()
                        this.status = 1
                        this.emit('status', this.status)
                    })

                    this.window.on('show', e => {
                        const bounds = { width: 0, height: 0, x: 0, y: 0 }
                        const { screen } = require('electron')
                    
                        // Get the dimensions to work with.
                        const { width, height } = screen.getPrimaryDisplay().workAreaSize
                        const { x, y } = this.tray.getBounds()

                        // Properly size the window to the screen.
                        bounds.width = Math.floor(width / 3)
                        bounds.height = Math.floor(height / 1.2)
                        
                        // Screen Location (Near the Tray Icon)
                        bounds.x = (x > (width / 2))    ? (width - bounds.width - 50)   : 50
                        bounds.y = (y > (height / 2))   ? (height - bounds.height - 50) : 50

                        this.window.setBounds(bounds)
                    })
                
                // Window still exists. Show it.
                } else this.window.show()
            })
        }
    }
}

class AppTray extends TraySite {
    constructor() {
        // Build parent object.
        super()

        // Set some defaults.
        this.id     = "main"
        this.url    = `${__dirname}/UI/app.html`
        this.icon   = nativeImage.createFromPath(`${__dirname}/UI/images/tray.png`)
        this.initialize()

        // Exit app via tray.
        const menu = Menu.buildFromTemplate([ { label: "Exit All", click: e => app.quit() } ])
        this.tray.setContextMenu(menu)
    }
}

const windows = []

const save = () => {
    const sites = windows.slice(1).filter(w => w.status > -2 ).map(w => { return w.url })
    awWrite('./sites.json', JSON.stringify(sites)).catch(error)
}

const find = id => { return windows.filter(w => w.id === id)[0] }

const add = url => {
    // Build the new site object.
    const site = new TraySite(url)
    site.initialize()

    // Send a message to the main window every time its status changes.
    site.on('status', data => windows[0].window.webContents.send('status', { id: site.id, status: data }))

    // Push to the windows array.
    windows.push(site)

    // Update main window when it's ready to inform it of the new tray.
    windows[0].window.on('ready-to-show', () => windows[0].window.webContents.send('new', { id: site.id, url: site.url }))

    return site
}

// App is ready. So is my body.
app.on('ready', async () => {

    // Build the App window.
    const main = new AppTray
    windows.push(main)

    // Open the main app window.
    main.tray.emit('click')

    // Load the savefile.
    const file  = await awRead(`./sites.json`).catch(error)
    const sites = await awParseJSON(file).catch(error)
    if(sites) for(let i = 0; i < sites.length; i++) add(sites[i]) 
})

// Stop the app from closing prematurely.
app.on('window-all-closed', e => e.preventDefault())

// Events from the App Window.
ipcMain.on('add', (e, data) => {
    const site = add(data)
    e.sender.send('new', { id: site.id, url: site.url })
    save()
})

ipcMain.on('open', (e, data) => {
    const site = find(data)
    if(!site.ready) site.initialize()
    site.tray.emit('click')
})

ipcMain.on('stop', (e, data) => {
    const site = find(data)
    site.stop()
})

ipcMain.on('exit', (e, data) => {
    const site = find(data)
    site.exit()
})

ipcMain.on('delete', (e, data) => {
    const site = find(data)
    site.exit()
    site.status = -2
    save()
})

/**/