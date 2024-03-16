import * as acorn from 'acorn'
import jsx from 'acorn-jsx'
import * as acornLoose from 'acorn-loose'
import { tsPlugin } from 'acorn-typescript'
import * as recast from 'recast'

export function registerParser() {
  const parserTSPlugin = tsPlugin()

  // TODO: Types
  const parser = acorn.Parser.extend(parserTSPlugin).extend(jsx())
  // const looseParser = acornLoose.LooseParser.extend(jsx())

  const { print } = recast
  const namedTypes = recast.types.namedTypes
  return { print, parser, namedTypes }
}

export function getAst(parser, code) {

}
