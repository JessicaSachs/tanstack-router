import * as acorn from 'acorn'
import jsx from 'acorn-jsx'
import * as acornLoose from 'acorn-loose'
import { tsPlugin } from 'acorn-typescript'
import { createRequire } from 'module'
import * as recast from 'recast'
import type { RouteNode } from '../generator'

const require = createRequire(import.meta.url)

/** @typedef {acorn.Node & { comments: any[]; tokens: any[] }} AST */
/** @type {any} */

console.log(tsPlugin)
const parserTSPlugin = tsPlugin()
const parser = acorn.Parser.extend(parserTSPlugin).extend(jsx())
const looseParser = acornLoose.LooseParser.extend(jsx())

const { print } = recast
const namedTypes = recast.types.namedTypes

// Support finding local identifiers within the file
function findLocalIdentifier(
  node: recast.types.namedTypes.Identifier,
  ast: recast.types.namedTypes.Program,
) {}

const registerImportedIdentifier = () => {}

function parseRouteVariableInit(
  node: recast.types.namedTypes.VariableDeclarator,
) {
  let optionsNode: recast.types.namedTypes.ObjectExpression
  let componentProperty: recast.types.namedTypes.Property | undefined
  const init = node.init
  if (
    namedTypes.CallExpression.check(node.init) &&
    namedTypes.ObjectExpression.check(node.init.arguments[0])
  ) {
    optionsNode = node.init.arguments[0]
    for (const property of optionsNode.properties) {
      if (
        namedTypes.Property.check(property) &&
        namedTypes.Identifier.check(property.key) &&
        property.key.name === 'component'
      ) {
        componentProperty = property
      }
    }
  }
  return componentProperty
}

// TODO: types
function findRoutesExport(ast: recast.types.namedTypes.Program) {
  const rootDeclarationsByIdentifier: Record<
    string,
    recast.types.namedTypes.ASTNode
  > = {}
  let routeExport: recast.types.namedTypes.VariableDeclarator | undefined
  for (const rootDeclaration of ast.body) {
    // Collect all of the root-level identifiers that may match the referenced value the component object.
    if (namedTypes.Identifier.check(rootDeclaration.id)) {
      rootDeclarationsByIdentifier[rootDeclaration.id.name] = rootDeclaration
    }

    // If it's the "exported route", collect that node so we can mutate it later

    if (namedTypes.ImportDeclaration.check(rootDeclaration)) {
      registerImportedIdentifier(rootDeclaration.specifiers)
    }

    if (
      namedTypes.ExportNamedDeclaration.check(rootDeclaration) &&
      namedTypes.VariableDeclaration.check(rootDeclaration.declaration)
    ) {
      for (const declaration of rootDeclaration.declaration.declarations) {
        if (
          namedTypes.VariableDeclarator.check(declaration) &&
          namedTypes.Identifier.check(declaration.id) &&
          declaration.id.name === 'Route'
        ) {
          routeExport = declaration
          // break
        }
      }
    }
    // if (routeExport) {
    //   // break
    // }
  }

  // Once we've finished going over everything return out the necessary bits of the AST we'll need to mutate

  // First, we'll need to modify the `component` option
  //  - 1. Within the component's init's call expressions arguments,
  //       the component property's value should be updated to look like:
  //       
  // Then, we'll need to grab a reference to the matching node (or import) whose name matches the component name
  // TODO: handling dependencies of the component
  //   - We'll duplicate the file in its entirety to avoid attempting to execute the code and figure out what will get tree-shaken
  //   - We can leave Vite to figure out which imports are unused and should be tree-shaken away.
  //   - We will NOT clean up dependencies in the Route within the generated code. Any compon
  return { routeExport, rootDeclarationsByIdentifier }
}

export function parseRouteFromFile(routeNode: RouteNode, source: string) {
  console.log('ok')

  const ast = parser.parse(source, {
    ecmaVersion: 'latest',
    sourceType: 'module',
  })

  try {
    const { routeExport, rootDeclarationsByIdentifier } = findRoutesExport(ast)
    let exportedValue: recast.types.ASTNode
    if (routeExport) {
      const newRouteExport = parseRouteVariableInit(routeExport)
      if (newRouteExport && namedTypes.Identifier.check(newRouteExport.key)) {
        exportedValue = newRouteExport.value
        rootDeclarationsByIdentifier
        console.log(print(exportedValue).code)
      }
      // console.log(newRouteExport)
    }

    return routeExport
  } catch (err) {
    console.error('missing Routes', err)
    // TODO: Handle `Routes` not exported issue
  }

  // console.log(print(parse(source)).code)
}
