import { passportLink } from '../navigation/passport';
import { useCollection } from '../state/CollectionProvider';

export function usePassportLink() {
  const { collection } = useCollection();
  return (id: string, tab?: string) => passportLink(id, collection?.records ?? [], tab);
}
