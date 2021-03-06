import { flatten, isString, isFunction, platform } from '../util'
import DefaultIconProvider from './DefaultIconProvider'
import DefaultLabelProvider from './DefaultLabelProvider'
import SwitchTextTypeCommand from './SwitchTextTypeCommand'

export default class Configurator {
  constructor (parent, name) {
    this.parent = parent
    this.name = name

    this._subConfigurations = new Map()
    this._values = new Map()
    this._commands = new Map()
    this._commandGroups = new Map()
    this._components = new Map()
    this._converters = new Map()
    this._documentLoaders = new Map()
    this._documentSerializers = new Map()
    this._dropHandlers = []
    this._exporters = new Map()
    this._icons = new Map()
    this._importers = new Map()
    this._keyboardShortcuts = []
    this._keyboardShortcutsByCommandName = new Map()
    this._labels = new Map()
    this._nodes = new Map()
    this._toolPanels = new Map()
    this._services = new Map()

    // hierarchical registries
    this._valuesRegistry = new HierarchicalRegistry(this, c => c._values)
    this._commandRegistry = new HierarchicalRegistry(this, c => c._commands)
    this._componentRegistry = new HierarchicalRegistry(this, c => c._components)
    this._iconRegistry = new HierarchicalRegistry(this, c => c._icons)
    this._labelRegistry = new HierarchicalRegistry(this, c => c._labels)
    this._serviceRegistry = new HierarchicalRegistry(this, c => c._services)
    this._toolPanelRegistry = new HierarchicalRegistry(this, c => c._toolPanels)
    this._keyboardShortcutsByCommandNameRegistry = new HierarchicalRegistry(this, c => c._keyboardShortcutsByCommandName)
    this._commandGroupRegistry = new HierarchicalRegistry(this, c => c._commandGroups)
  }

  import (pkg, options) {
    pkg.configure(this, options || {})
    return this
  }

  createSubConfiguration (name, options = {}) {
    const ConfiguratorClass = options.ConfiguratorClass || this.constructor
    const subConfig = new ConfiguratorClass(this, name)
    this._subConfigurations.set(name, subConfig)
    return subConfig
  }

  getConfiguration (path) {
    // TODO: implement this in a strict way
    if (isString(path)) {
      path = path.split('.')
    }
    const subConfig = this._subConfigurations.get(path[0])
    if (path.length === 1) {
      return subConfig
    } else {
      if (subConfig) {
        return subConfig.getConfiguration(path.slice(1))
      }
    }
  }

  getValue (key) {
    return this._valuesRegistry.get(key)
  }

  setValue (key, value) {
    this._values.set(key, value)
  }

  addCommand (name, CommandClass, options = {}) {
    if (this._commands.has(name) && !options.force) throw new Error(`Command with name '${name}' already registered`)
    this._commands.set(name, new CommandClass(Object.assign({ name }, options)))
    if (options.commandGroup) {
      this._addCommandToCommandGroup(name, options.commandGroup)
    }
    if (options.accelerator) {
      this.addKeyboardShortcut(options.accelerator, { command: name })
    }
  }

  addComponent (name, ComponentClass, options = {}) {
    if (this._components.has(name) && !options.force) throw new Error(`Component with name '${name}' already registered`)
    this._components.set(name, ComponentClass)
  }

  addConverter (format, converter) {
    let converters = this._converters.get(format)
    if (!converters) {
      converters = new Map()
      this._converters.set(format, converters)
    }
    if (isFunction(converter)) {
      const ConverterClass = converter
      converter = new ConverterClass()
    }
    if (!converter.type) {
      throw new Error('A converter needs an associated type.')
    }
    converters.set(converter.type, converter)
  }

  addDropHandler (dropHandler) {
    this._dropHandlers.push(dropHandler)
  }

  addExporter (format, ExporterClass, spec = {}) {
    if (this._exporters.has(format)) throw new Error(`Exporter already registered for '${format}'`)
    this._exporters.set(format, {
      ExporterClass,
      spec
    })
  }

  addIcon (iconName, spec, options = {}) {
    if (!this._icons.has(iconName)) {
      this._icons.set(iconName, {})
    }
    const iconConfig = this._icons.get(iconName)
    for (const type of Object.keys(spec)) {
      if (iconConfig[type]) {
        if (!options.force) {
          throw new Error(`Icon already specified: ${iconName}:${type}`)
        }
      }
      iconConfig[type] = spec[type]
    }
  }

  addImporter (format, ImporterClass, spec = {}) {
    if (this._importers.has(format)) throw new Error(`Importer already registered for '${format}'`)
    this._importers.set(format, {
      ImporterClass,
      spec
    })
  }

  addLabel (labelName, label, options = {}) {
    if (this._labels.has(labelName) && !options.force) throw new Error(`Label with name '${labelName}' already registered.`)
    let labels
    if (isString(label)) {
      labels = { en: label }
    } else {
      labels = label
    }
    this._labels.set(labelName, labels)
  }

  addNode (NodeClass, options = {}) {
    const type = NodeClass.type
    if (this._nodes.has(type) && !options.force) {
      throw new Error(`Node class for type '${type}' already registered`)
    }
    this._nodes.set(type, NodeClass)
  }

  addKeyboardShortcut (combo, spec) {
    let label = combo.toUpperCase()
    if (platform.isMac) {
      label = label.replace(/CommandOrControl/i, '⌘')
      label = label.replace(/Ctrl/i, '^')
      label = label.replace(/Shift/i, '⇧')
      label = label.replace(/Enter/i, '↵')
      label = label.replace(/Alt/i, '⌥')
      label = label.replace(/\+/g, '')
    } else {
      label = label.replace(/CommandOrControl/i, 'Ctrl')
    }
    const entry = {
      key: combo,
      label,
      spec
    }
    this._keyboardShortcuts.push(entry)
    if (spec.command) {
      this._keyboardShortcutsByCommandName.set(spec.command, entry)
    }
  }

  // TODO: this should be a helper, if necessary at all
  addTextTypeTool (spec) {
    this.addCommand(spec.name, SwitchTextTypeCommand, {
      spec: spec.nodeSpec,
      commandGroup: 'text-types'
    })
    this.addIcon(spec.name, { fontawesome: spec.icon })
    this.addLabel(spec.name, spec.label)
    if (spec.accelerator) {
      this.addKeyboardShortcut(spec.accelerator, { command: spec.name })
    }
  }

  addToolPanel (name, spec, options = {}) {
    if (this._toolPanels.has(name) && !options.force) {
      throw new Error(`ToolPanel '${name}' is already defined`)
    }
    this._toolPanels.set(name, spec)
  }

  // EXPERIMENTAL: for now we just use a callback as it is the most flexible
  // but on the long run I think it would better to restrict this by introducing a DSL
  extendToolPanel (name, extensionCb) {
    extensionCb(this._toolPanels.get(name))
  }

  addService (serviceId, factory, options = {}) {
    if (this._services.has(serviceId) && !options.force) {
      throw new Error(`Service '${serviceId}' is already defined`)
    }
    this._services.set(serviceId, {
      factory,
      instance: null
    })
  }

  getService (serviceId, context) {
    const entry = this._serviceRegistry.get(serviceId)
    if (entry) {
      if (entry.instance) {
        return Promise.resolve(entry.instance)
      } else {
        const res = entry.factory(context)
        if (res instanceof Promise) {
          return res.then(service => {
            entry.instance = service
            return service
          })
        } else {
          entry.instance = res
          return Promise.resolve(res)
        }
      }
    } else {
      return Promise.reject(new Error(`Unknown service: ${serviceId}`))
    }
  }

  getServiceSync (serviceId, context) {
    const entry = this._serviceRegistry.get(serviceId)
    if (entry) {
      if (entry && entry.instance) {
        return entry.instance
      } else {
        const service = entry.factory(context)
        entry.instance = service
        return service
      }
    }
  }

  registerDocumentLoader (docType, LoaderClass, spec = {}, options = {}) {
    if (this._documentLoaders.has(docType) && !options.force) {
      throw new Error(`Loader for docType '${docType}' is already defined`)
    }
    this._documentLoaders.set(docType, {
      LoaderClass,
      spec
    })
  }

  registerDocumentSerializer (docType, SerializerClass, spec = {}, options = {}) {
    if (this._documentSerializers.has(docType) && !options.force) {
      throw new Error(`Serializer for docType '${docType}' is already defined`)
    }
    this._documentSerializers.set(docType, {
      SerializerClass,
      spec
    })
  }

  getCommands (options = {}) {
    if (options.inherit) {
      return this._commandRegistry.getAll()
    } else {
      return this._commands
    }
  }

  getCommandGroup (name) {
    // Note: as commands are registered hierarchically
    // we need to collect commands from all levels
    const records = this._commandGroupRegistry.getRecords(name)
    const flattened = flatten(records)
    const set = new Set(flattened)
    return Array.from(set)
  }

  getComponent (name) {
    return this.getComponentRegistry().get(name, 'strict')
  }

  getComponentRegistry () {
    return this._componentRegistry
  }

  getConverters (type) {
    if (this._converters.has(type)) {
      return Array.from(this._converters.get(type).values())
    } else {
      return []
    }
  }

  getDocumentLoader (type) {
    if (this._documentLoaders.has(type)) {
      const { LoaderClass, spec } = this._documentLoaders.get(type)
      return new LoaderClass(spec)
    }
  }

  getDocumentSerializer (type) {
    if (this._documentSerializers.has(type)) {
      const { SerializerClass, spec } = this._documentSerializers.get(type)
      return new SerializerClass(spec)
    }
  }

  getIconProvider () {
    return new DefaultIconProvider(this)
  }

  // TODO: the label provider should not be maintained by the configuration
  // instead by the app, because language should be part of the app state
  getLabelProvider () {
    return new LabelProvider(this)
  }

  createImporter (type, doc, options = {}) {
    if (this._importers.has(type)) {
      const { ImporterClass, spec } = this._importers.get(type)
      let converters = []
      if (spec.converterGroups) {
        for (const key of spec.converterGroups) {
          converters = converters.concat(this.getConverters(key))
        }
      } else {
        converters = this.getConverters(type)
      }
      return new ImporterClass({ converters }, doc, options, this)
    } else if (this.parent) {
      return this.parent.createImporter(type, doc, options)
    }
  }

  createExporter (type, doc, options = {}) {
    if (this._exporters.has(type)) {
      const { ExporterClass, spec } = this._exporters.get(type)
      let converters = []
      if (spec.converterGroups) {
        for (const key of spec.converterGroups) {
          converters = converters.concat(this.getConverters(key))
        }
      } else {
        converters = this.getConverters(type)
      }
      return new ExporterClass({ converters }, doc, options, this)
    } else if (this.parent) {
      return this.parent.createExporter(type, doc, options)
    }
  }

  getKeyboardShortcuts (options = {}) {
    if (options.inherit) {
      return Array.from(this._keyboardShortcutsByCommandNameRegistry.getAll().values())
    } else {
      return this._keyboardShortcuts
    }
  }

  /*
    Allows lookup of a keyboard shortcut by command name
  */
  getKeyboardShortcutsByCommandName (commandName) {
    return this._keyboardShortcutsByCommandNameRegistry.get(commandName)
  }

  getNodes () {
    return this._nodes
  }

  getToolPanel (name, strict) {
    const toolPanelSpec = this._toolPanelRegistry.get(name)
    if (toolPanelSpec) {
      return toolPanelSpec
    } else if (strict) {
      throw new Error(`No toolpanel configured with name ${name}`)
    }
  }

  _addCommandToCommandGroup (commandName, commandGroupName) {
    if (!this._commandGroups.has(commandGroupName)) {
      this._commandGroups.set(commandGroupName, [])
    }
    const commands = this._commandGroups.get(commandGroupName)
    commands.push(commandName)
  }
}

class HierarchicalRegistry {
  constructor (config, getter) {
    this._config = config
    this._getter = getter
  }

  get (name, strict) {
    let config = this._config
    const getter = this._getter
    while (config) {
      const registry = getter(config)
      if (registry.has(name)) {
        return registry.get(name)
      } else {
        config = config.parent
      }
    }
    if (strict) throw new Error(`No value registered for name '${name}'`)
  }

  getAll () {
    let config = this._config
    const registries = []
    const getter = this._getter
    while (config) {
      const registry = getter(config)
      if (registry) {
        registries.unshift(registry)
      }
      config = config.parent
    }
    return new Map([].concat(...registries.map(r => Array.from(r.entries()))))
  }

  getRecords (name) {
    let config = this._config
    const records = []
    const getter = this._getter
    while (config) {
      const registry = getter(config)
      if (registry) {
        const record = registry.get(name)
        if (record) {
          records.unshift(record)
        }
      }
      config = config.parent
    }
    return records
  }
}

class LabelProvider extends DefaultLabelProvider {
  constructor (config) {
    super()
    this.config = config
  }

  getLabel (name, params) {
    const lang = this.lang
    const spec = this.config._labelRegistry.get(name)
    if (!spec) return name
    const rawLabel = spec[lang] || name
    // If context is provided, resolve templates
    if (params) {
      return this._evalTemplate(rawLabel, params)
    } else {
      return rawLabel
    }
  }
}
