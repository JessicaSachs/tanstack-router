import { ModuleDeclaration, Program } from 'acorn'
import type { RouteNode } from '../generator'
import { registerParser } from './setup'
import * as recast from 'recast'

const { parser, namedTypes, print } = registerParser()

// type RootDeclarationNode = Program["body"][number]
// // Support finding local identifiers within the file
// function findLocalIdentifier(
//   node: recast.types.namedTypes.Identifier,
//   ast: recast.types.namedTypes.Program,
// ) {}

// const registerImportedIdentifier = () => {}

// function parseRouteVariableInit(
//   node: recast.types.namedTypes.VariableDeclarator,
// ) {
//   let optionsNode: recast.types.namedTypes.ObjectExpression
//   let componentProperty: recast.types.namedTypes.Property | undefined
//   const init = node.init
//   if (
//     namedTypes.CallExpression.check(node.init) &&
//     namedTypes.ObjectExpression.check(node.init.arguments[0])
//   ) {
//     optionsNode = node.init.arguments[0]
//     for (const property of optionsNode.properties) {
//       if (
//         namedTypes.Property.check(property) &&
//         namedTypes.Identifier.check(property.key) &&
//         property.key.name === 'component'
//       ) {
//         componentProperty = property
//       }
//     }
//   }
//   return componentProperty
// }

// // TODO: types
// function findRoutesExport(ast: recast.types.namedTypes.Program) {
//   const rootDeclarationsByIdentifier: Record<
//     string,
//     recast.types.namedTypes.ASTNode
//   > = {}
//   let routeExport: recast.types.namedTypes.VariableDeclarator | undefined
//   for (const rootDeclaration of ast.body) {
//     // Collect all of the root-level identifiers that may match the referenced value the component object.
//     if (namedTypes.Identifier.check(rootDeclaration.id)) {
//       rootDeclarationsByIdentifier[rootDeclaration.id.name] = rootDeclaration
//     }

//     // If it's the "exported route", collect that node so we can mutate it later

//     if (namedTypes.ImportDeclaration.check(rootDeclaration)) {
//       registerImportedIdentifier(rootDeclaration.specifiers)
//     }


//     // if (routeExport) {
//     //   // break
//     // }
//   }

//   // Once we've finished going over everything return out the necessary bits of the AST we'll need to mutate

//   // First, we'll need to modify the `component` option
//   //  - 1. Within the component's init's call expressions arguments,
//   //       the component property's value should be updated to look like:
//   //
//   // Then, we'll need to grab a reference to the matching node (or import) whose name matches the component name
//   // TODO: handling dependencies of the component
//   //   - We'll duplicate the file in its entirety to avoid attempting to execute the code and figure out what will get tree-shaken
//   //   - We can leave Vite to figure out which imports are unused and should be tree-shaken away.
//   //   - We will NOT clean up dependencies in the Route within the generated code. Any compon
//   return { routeExport, rootDeclarationsByIdentifier }
// }

// function getRouteNodeIfExists(node: RootDeclarationNode) {
//   let routeExportNode;
//   if (
//     namedTypes.ExportNamedDeclaration.check(node) &&
//     namedTypes.VariableDeclaration.check(node.declaration)
//   ) {
//     for (const declaration of node.declaration.declarations) {
//       if (
//         namedTypes.VariableDeclarator.check(declaration) &&
//         namedTypes.Identifier.check(declaration.id) &&
//         declaration.id.name === 'Route'
//       ) {
//         routeExportNode = declaration
//       }
//     }
//   }

//   return { routeExportNode }
// }

type AST = Program
type BodyNode = AST["body"]
type Declaration = BodyNode[number]
type Node = recast.types.ASTNode
type State = {
  refs: Record<string, unknown>,
  globalImports: unknown[]
}

function getAst(source: string): AST {
  try {
    return parser.parse(source, {
      ecmaVersion: 'latest',
      sourceType: 'module',
    })
  } catch (err) {
    throw new Error(`Unable to parse AST: ${err}`)
  }
}

export function parseRouteFromFile(routeNode: RouteNode, source: string) {
  const state: State = {
    refs: {},
    globalImports: []
  }

  const config = {
    exports: [{ id: 'Route', required: true }],
    options: [{ id: 'component', required: true }],
    prepend: {
      imports: [`import * as React from 'react';`]
    },
    append: {},
  } as const

  const ast = getAst(source)
  const body = ast.body

  function isSpecialExport(node: recast.types.namedTypes.ExportNamedDeclaration) {
    // TODO types
    for (const declaration of node.declaration?.declarations) {
      if (
        namedTypes.VariableDeclarator.check(declaration) &&
        namedTypes.Identifier.check(declaration.id)
      ) {
        for (const { id: targetName } of config.exports) {
          if (declaration.id.name === targetName) {
            console.log('Step inside of', declaration.id.name, 'to find the required properties in the initializer')
          }
        }
        // TODO: check that all required exports are present
      }
    }
  }

  // Any time a new variable is introduced, add it to the state
  function handleImport(node: Node, _state: typeof state) {
    if (namedTypes.ImportDeclaration.check(node)) {
      _state.globalImports.push(node)
    }
  }

  function handleExport(node: Node, _state: typeof state) {
    if (namedTypes.ExportNamedDeclaration.check(node) &&
    namedTypes.VariableDeclaration.check(node.declaration)) {

      isSpecialExport(node, config)
    }
  }

  function enter(declarations: Declaration[], _state: typeof state) {
    for (const declaration of declarations) {
      visit(declaration, _state)
    }
  }

  function visit(node: Node, _state: typeof state) {
    handleImport(node, _state)
    handleExport(node, _state)
  }

  enter(body.declarations, state)

  // let routeExport;


  // function visit(node: RootDeclarationNode, depth = 0) {
  //   if (depth === 0) {
  //     if (!routeExport) {
  //       routeExport = getRouteNodeIfExists(node)
  //     }
  //   }
  // }

  // for (const rootDeclaration of ast.body) {
  //   visit(rootDeclaration)
  // }

  // try {
  //   const { routeExport, rootDeclarationsByIdentifier } = findRoutesExport(ast)
  //   let exportedValue: recast.types.ASTNode
  //   if (routeExport) {
  //     const newRouteExport = parseRouteVariableInit(routeExport)
  //     if (newRouteExport && namedTypes.Identifier.check(newRouteExport.key)) {
  //       exportedValue = newRouteExport.value
  //       rootDeclarationsByIdentifier
  //       console.log(print(exportedValue).code)
  //     }
  //     // console.log(newRouteExport)
  //   }

  //   return routeExport
  // } catch (err) {
  //   console.error('missing Routes', err)
  //   // TODO: Handle `Routes` not exported issue
  // }

  // console.log(print(parse(source)).code)
}
