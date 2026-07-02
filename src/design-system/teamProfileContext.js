import { createContext, useContext } from 'react'

export const TeamProfileContext = createContext(null)

export function useTeamProfileActivation() {
  return useContext(TeamProfileContext)
}
