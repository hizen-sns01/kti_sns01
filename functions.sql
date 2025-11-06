
  VALUES (auth.uid(), content_new);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;